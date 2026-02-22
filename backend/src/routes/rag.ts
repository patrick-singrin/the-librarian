import { Router } from 'express'
import { ragAsk, ragStats, ragCheckNew, ragSync, ragSyncStream, ragIndexedDocuments, ragSpaces, ragCreateSpace, ragUpdateSpace, ragDeleteSpace, ragWipeSpace } from '../services/rag-client.js'
import { listDocumentsBySpace, type PaperlessSpaceDoc } from '../services/paperless-client.js'
import { startSyncJob, onSyncStart, onSyncProgress, onSyncComplete, onSyncError, getSyncProgress } from '../services/sync-progress.js'
import { invalidate } from '../services/event-bus.js'

export const ragRouter = Router()

ragRouter.post('/ask', async (req, res) => {
  try {
    const result = await ragAsk(req.body)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.get('/stats', async (req, res) => {
  try {
    const spaceId = req.query.space_id as string | undefined
    const result = await ragStats(spaceId)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.get('/check-new', async (req, res) => {
  try {
    const spaceId = req.query.space_id as string | undefined

    // Fetch RAG check-new, stats, and spaces list in parallel
    const [checkNewResult, statsResult, spacesResult] = await Promise.allSettled([
      ragCheckNew(spaceId),
      ragStats(spaceId),
      ragSpaces(),
    ])
    if (checkNewResult.status === 'rejected') throw checkNewResult.reason
    const data = checkNewResult.value as Record<string, unknown>

    // Enrich with model names from stats (if available)
    if (statsResult.status === 'fulfilled') {
      const stats = statsResult.value as Record<string, unknown>
      data.embedding_model = stats.embedding_model ?? null
      data.llm_model = stats.llm_model ?? null
    }

    // Fix total_in_paperless and new_documents from Paperless custom-field query.
    // The RAG API doesn't correctly resolve space membership via Paperless custom
    // fields, so we query Paperless ourselves and diff against RAG indexed docs.
    const allSlugs = spacesResult.status === 'fulfilled' && Array.isArray(spacesResult.value)
      ? (spacesResult.value as Array<{ slug: string }>).map((s) => s.slug)
      : []
    const targetSlugs = spaceId ? [spaceId] : allSlugs

    if (targetSlugs.length > 0) {
      // Fetch Paperless docs and RAG indexed docs for each target space in parallel
      const [paperlessResults, indexedResults] = await Promise.all([
        Promise.allSettled(targetSlugs.map((slug) => listDocumentsBySpace(slug))),
        Promise.allSettled(targetSlugs.map((slug) => ragIndexedDocuments(slug))),
      ])

      // Build indexed-doc-ID set per space
      const indexedBySpace = new Map<string, Set<number>>()
      targetSlugs.forEach((slug, i) => {
        const result = indexedResults[i]
        if (result.status === 'fulfilled') {
          const docs = (result.value as { documents: Array<{ doc_id: number }> }).documents
          indexedBySpace.set(slug, new Set(docs.map((d) => d.doc_id)))
        }
      })

      // Merge Paperless docs across spaces, deduplicating by doc ID
      const docsById = new Map<number, PaperlessSpaceDoc>()
      targetSlugs.forEach((slug, i) => {
        const result = paperlessResults[i]
        if (result.status !== 'fulfilled') return
        for (const doc of result.value.documents) {
          const existing = docsById.get(doc.id)
          if (existing) {
            // Merge spaces — doc might appear in multiple space queries
            for (const s of doc.spaces) {
              if (!existing.spaces.includes(s)) existing.spaces.push(s)
            }
          } else {
            docsById.set(doc.id, { ...doc })
          }
        }
      })

      const allDocs = [...docsById.values()]

      // A document is "new" if it's not indexed in at least one of its assigned spaces
      const newDocs = allDocs.filter((doc) => {
        const assignedSlugs = doc.spaces.filter((s) => targetSlugs.includes(s))
        return assignedSlugs.some((s) => !indexedBySpace.get(s)?.has(doc.id))
      })

      data.total_in_paperless = allDocs.length
      data.new_count = newDocs.length
      data.new_documents = newDocs.map((d) => ({
        id: d.id,
        title: d.title,
        spaces: d.spaces,
      }))
    }

    res.json(data)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.post('/sync', async (req, res) => {
  try {
    const result = await ragSync(req.body)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

/**
 * SSE proxy: streams sync progress from RAG API → client.
 * Also writes every event into the in-memory store so GET /sync/progress works.
 */
ragRouter.post('/sync/stream', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  startSyncJob()

  try {
    const upstream = await ragSyncStream(req.body)
    const body = upstream.body
    if (!body) {
      onSyncError('No response body from RAG API')
      res.write('event: sync:error\ndata: {"error":"No response body from RAG API"}\n\n')
      res.end()
      return
    }

    const reader = (body as unknown as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // Read the upstream SSE stream chunk by chunk
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse complete SSE messages (delimited by double newline)
      const parts = buffer.split('\n\n')
      // Keep the last (possibly incomplete) chunk in the buffer
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        if (!part.trim()) continue

        // Extract event name and data from SSE block
        let eventName = ''
        let dataStr = ''
        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) eventName = line.slice(7).trim()
          else if (line.startsWith('data: ')) dataStr = line.slice(6)
        }

        if (!eventName || !dataStr) continue

        // Update in-memory store
        try {
          const data = JSON.parse(dataStr)
          if (eventName === 'sync:start') onSyncStart(data)
          else if (eventName === 'sync:progress') onSyncProgress(data)
          else if (eventName === 'sync:complete') {
            onSyncComplete(data)
            invalidate('rag-check-new', 'rag-indexed-documents', 'rag-spaces-overview')
          }
        } catch {
          // JSON parse error — forward anyway
        }

        // Forward the SSE event verbatim to the client
        res.write(`event: ${eventName}\ndata: ${dataStr}\n\n`)
      }
    }

    // Flush any remaining buffer
    if (buffer.trim()) {
      let eventName = ''
      let dataStr = ''
      for (const line of buffer.split('\n')) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataStr = line.slice(6)
      }
      if (eventName && dataStr) {
        try {
          const data = JSON.parse(dataStr)
          if (eventName === 'sync:start') onSyncStart(data)
          else if (eventName === 'sync:progress') onSyncProgress(data)
          else if (eventName === 'sync:complete') {
            onSyncComplete(data)
            invalidate('rag-check-new', 'rag-indexed-documents', 'rag-spaces-overview')
          }
        } catch {
          // ignore
        }
        res.write(`event: ${eventName}\ndata: ${dataStr}\n\n`)
      }
    }

    res.end()
  } catch (e) {
    const msg = (e as Error).message
    onSyncError(msg)
    res.write(`event: sync:error\ndata: ${JSON.stringify({ error: msg })}\n\n`)
    res.end()
  }
})

/** Polling fallback: returns current sync job state from in-memory store. */
ragRouter.get('/sync/progress', (_req, res) => {
  res.json(getSyncProgress())
})

ragRouter.get('/indexed-documents', async (req, res) => {
  try {
    const spaceId = req.query.space_id as string | undefined
    if (!spaceId) {
      res.status(400).json({ error: 'space_id query parameter is required' })
      return
    }
    const result = await ragIndexedDocuments(spaceId)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

/**
 * Single-call aggregate for space tiles: returns all spaces with indexed/total
 * counts so the frontend needs only one query key (instant cache from localStorage).
 */
ragRouter.get('/spaces-overview', async (_req, res) => {
  try {
    // 1. Fetch space list and all Paperless docs with space assignment in parallel
    const [spacesResult, paperlessResult] = await Promise.allSettled([
      ragSpaces(),
      listDocumentsBySpace(), // no slug → all docs that have the RAG Spaces field
    ])

    if (spacesResult.status === 'rejected') throw spacesResult.reason
    const spaces = spacesResult.value as Array<{ slug: string; name: string }>

    // Graceful degradation: if Paperless is down, totals will be 0
    const allDocs = paperlessResult.status === 'fulfilled'
      ? (paperlessResult.value as { documents: PaperlessSpaceDoc[] }).documents
      : []

    // 2. Fetch indexed doc IDs for each space in parallel
    const indexedResults = await Promise.allSettled(
      spaces.map((s) => ragIndexedDocuments(s.slug)),
    )

    // 3. Build per-space stats
    const result = spaces.map((space, i) => {
      // Indexed doc IDs for this space
      const indexedSet = new Set<number>()
      if (indexedResults[i].status === 'fulfilled') {
        const docs = (indexedResults[i].value as { documents: Array<{ doc_id: number }> }).documents
        for (const d of docs) indexedSet.add(d.doc_id)
      }

      // Paperless docs belonging to this space
      const spaceDocs = allDocs.filter((d) => d.spaces.includes(space.slug))
      const newCount = spaceDocs.filter((d) => !indexedSet.has(d.id)).length

      return {
        slug: space.slug,
        name: space.name,
        indexed: indexedSet.size,
        total: Math.max(spaceDocs.length, indexedSet.size),
        newCount,
      }
    })

    res.json({ spaces: result, timestamp: new Date().toISOString() })
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.get('/spaces', async (_req, res) => {
  try {
    const result = await ragSpaces()
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.post('/spaces', async (req, res) => {
  try {
    const result = await ragCreateSpace(req.body)
    invalidate('rag-spaces', 'rag-check-new', 'rag-spaces-overview')
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.put('/spaces/:slug', async (req, res) => {
  try {
    const result = await ragUpdateSpace(req.params.slug, req.body)
    invalidate('rag-spaces', 'rag-check-new', 'rag-spaces-overview')
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.delete('/spaces/:slug', async (req, res) => {
  try {
    const result = await ragDeleteSpace(req.params.slug)
    invalidate('rag-spaces', 'rag-check-new', 'rag-indexed-documents', 'rag-spaces-overview')
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.post('/spaces/:slug/wipe', async (req, res) => {
  try {
    const result = await ragWipeSpace(req.params.slug)
    invalidate('rag-check-new', 'rag-indexed-documents', 'rag-spaces-overview')
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})
