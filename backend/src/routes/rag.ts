import { Router } from 'express'
import { ragAsk, ragStats, ragCheckNew, ragSync, ragIndexedDocuments, ragSpaces, ragCreateSpace, ragUpdateSpace, ragDeleteSpace } from '../services/rag-client.js'

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
    // Fetch check-new + stats in parallel so the frontend needs only one query
    const [checkNewResult, statsResult] = await Promise.allSettled([
      ragCheckNew(spaceId),
      ragStats(spaceId),
    ])
    if (checkNewResult.status === 'rejected') throw checkNewResult.reason
    const data = checkNewResult.value as Record<string, unknown>
    // Enrich with model names from stats (if available)
    if (statsResult.status === 'fulfilled') {
      const stats = statsResult.value as Record<string, unknown>
      data.embedding_model = stats.embedding_model ?? null
      data.llm_model = stats.llm_model ?? null
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
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.put('/spaces/:slug', async (req, res) => {
  try {
    const result = await ragUpdateSpace(req.params.slug, req.body)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.delete('/spaces/:slug', async (req, res) => {
  try {
    const result = await ragDeleteSpace(req.params.slug)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})
