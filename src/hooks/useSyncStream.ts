import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type {
  SyncStartEvent,
  SyncProgressEvent,
  SyncCompleteEvent,
  SyncDocProgress,
  SyncJobProgress,
} from '../types/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncPhase = 'idle' | 'streaming' | 'completed'

export interface SyncStreamState {
  /** Current phase of the sync lifecycle. */
  phase: SyncPhase
  /** Total documents to index (from sync:start). */
  total: number
  /** Number of successfully indexed docs so far. */
  indexedCount: number
  /** Number of failed docs so far. */
  failedCount: number
  /** Per-document progress list (order = sync order). */
  docs: SyncDocProgress[]
  /** Incremental per-space delta: slug → count of newly indexed docs. */
  indexedBySpace: Map<string, number>
  /** Final result payload (from sync:complete). */
  result: SyncCompleteEvent | null
  /** Error message if connection fails. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSyncStream() {
  const queryClient = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [state, setState] = useState<SyncStreamState>({
    phase: 'idle',
    total: 0,
    indexedCount: 0,
    failedCount: 0,
    docs: [],
    indexedBySpace: new Map(),
    result: null,
    error: null,
  })

  const isStreaming = state.phase === 'streaming'

  // -----------------------------------------------------------------------
  // SSE parser: reads the response body and dispatches state updates
  // -----------------------------------------------------------------------
  const consumeStream = useCallback(
    async (response: Response) => {
      const body = response.body
      if (!body) {
        setState((s) => ({ ...s, phase: 'completed', error: 'No response body' }))
        return
      }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            if (!part.trim()) continue

            let eventName = ''
            let dataStr = ''
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventName = line.slice(7).trim()
              else if (line.startsWith('data: ')) dataStr = line.slice(6)
            }

            if (!eventName || !dataStr) continue

            try {
              if (eventName === 'sync:start') {
                const data = JSON.parse(dataStr) as SyncStartEvent
                const docs: SyncDocProgress[] = data.doc_ids.map((id) => {
                  const meta = data.doc_meta[String(id)]
                  return {
                    doc_id: id,
                    title: meta?.title ?? `Document ${id}`,
                    status: 'pending',
                    spaces: meta?.spaces ?? [],
                    chunks_created: 0,
                  }
                })
                setState((s) => ({
                  ...s,
                  total: data.total,
                  docs,
                }))
              } else if (eventName === 'sync:progress') {
                const data = JSON.parse(dataStr) as SyncProgressEvent
                setState((s) => {
                  // Update the matching doc entry
                  const nextDocs = s.docs.map((d) =>
                    d.doc_id === data.doc_id
                      ? {
                          ...d,
                          status: data.status as SyncDocProgress['status'],
                          chunks_created: data.chunks_created,
                        }
                      : d,
                  )

                  // Update per-space indexed delta
                  const nextBySpace = new Map(s.indexedBySpace)
                  if (data.status === 'success') {
                    for (const slug of data.spaces) {
                      nextBySpace.set(slug, (nextBySpace.get(slug) ?? 0) + 1)
                    }
                  }

                  return {
                    ...s,
                    indexedCount: data.indexed_count,
                    failedCount: data.failed_count,
                    total: data.total,
                    docs: nextDocs,
                    indexedBySpace: nextBySpace,
                  }
                })
              } else if (eventName === 'sync:complete') {
                const data = JSON.parse(dataStr) as SyncCompleteEvent
                setState((s) => ({
                  ...s,
                  phase: 'completed',
                  indexedCount: data.indexed_count,
                  failedCount: data.failed_count,
                  result: data,
                }))
              } else if (eventName === 'sync:error') {
                const data = JSON.parse(dataStr) as { error: string }
                setState((s) => ({
                  ...s,
                  phase: 'completed',
                  error: data.error,
                }))
              }
            } catch {
              // JSON parse error — skip this event
            }
          }
        }
      } catch (e) {
        // Stream read error (abort or network)
        if ((e as Error).name !== 'AbortError') {
          setState((s) => ({
            ...s,
            phase: 'completed',
            error: (e as Error).message,
          }))
        }
      }
    },
    [],
  )

  // -----------------------------------------------------------------------
  // Polling fallback: used when user navigates away and returns mid-sync
  // -----------------------------------------------------------------------
  const startPollingFallback = useCallback(() => {
    if (pollingRef.current) return

    pollingRef.current = setInterval(async () => {
      try {
        const progress: SyncJobProgress = await api.ragSyncProgress()

        setState((s) => {
          // Build per-space delta from the doc list
          const nextBySpace = new Map<string, number>()
          for (const doc of progress.docs) {
            if (doc.status === 'success') {
              for (const slug of doc.spaces) {
                nextBySpace.set(slug, (nextBySpace.get(slug) ?? 0) + 1)
              }
            }
          }

          return {
            ...s,
            phase: progress.running ? 'streaming' : 'completed',
            total: progress.total,
            indexedCount: progress.indexedCount,
            failedCount: progress.failedCount,
            docs: progress.docs,
            indexedBySpace: nextBySpace,
            result: progress.result
              ? {
                  indexed_count: progress.result.indexedCount,
                  failed_count: progress.result.failedCount,
                  total_chunks: progress.result.totalChunks,
                  indexed_documents: progress.result.indexedDocuments,
                  failed_documents: progress.result.failedDocuments,
                }
              : null,
            error: progress.error,
          }
        })

        if (!progress.running) {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          // Invalidate queries to get fresh data
          queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
          queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
          queryClient.invalidateQueries({ queryKey: ['rag-spaces-overview'] })
        }
      } catch {
        // Network error — stop polling
        clearInterval(pollingRef.current!)
        pollingRef.current = null
      }
    }, 3000)
  }, [queryClient])

  // -----------------------------------------------------------------------
  // Start sync
  // -----------------------------------------------------------------------
  const startSync = useCallback(
    async (opts?: { docIds?: number[]; spaceId?: string }) => {
      // Reset state
      setState({
        phase: 'streaming',
        total: 0,
        indexedCount: 0,
        failedCount: 0,
        docs: [],
        indexedBySpace: new Map(),
        result: null,
        error: null,
      })

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await api.ragSyncStream(opts?.docIds, opts?.spaceId)

        // Consume the stream (updates state as events arrive)
        await consumeStream(response)

        // After stream ends, invalidate queries to refresh server truth
        queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
        queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
        queryClient.invalidateQueries({ queryKey: ['rag-spaces-overview'] })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setState((s) => ({
            ...s,
            phase: 'completed',
            error: (e as Error).message,
          }))
        }
      }
    },
    [consumeStream, queryClient],
  )

  // -----------------------------------------------------------------------
  // Check if a sync is running (mount-time check for navigation-away case)
  // -----------------------------------------------------------------------
  const checkRunningSync = useCallback(async () => {
    try {
      const progress: SyncJobProgress = await api.ragSyncProgress()
      if (progress.running) {
        // A sync is running but we have no SSE connection — use polling
        setState({
          phase: 'streaming',
          total: progress.total,
          indexedCount: progress.indexedCount,
          failedCount: progress.failedCount,
          docs: progress.docs,
          indexedBySpace: new Map(),
          result: null,
          error: null,
        })
        startPollingFallback()
      } else if (progress.result) {
        // Sync finished while we were away — show completion briefly
        setState({
          phase: 'completed',
          total: progress.total,
          indexedCount: progress.indexedCount,
          failedCount: progress.failedCount,
          docs: progress.docs,
          indexedBySpace: new Map(),
          result: {
            indexed_count: progress.result.indexedCount,
            failed_count: progress.result.failedCount,
            total_chunks: progress.result.totalChunks,
            indexed_documents: progress.result.indexedDocuments,
            failed_documents: progress.result.failedDocuments,
          },
          error: progress.error,
        })
      }
    } catch {
      // No running sync or endpoint not reachable — stay idle
    }
  }, [startPollingFallback])

  // -----------------------------------------------------------------------
  // Reset back to idle
  // -----------------------------------------------------------------------
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setState({
      phase: 'idle',
      total: 0,
      indexedCount: 0,
      failedCount: 0,
      docs: [],
      indexedBySpace: new Map(),
      result: null,
      error: null,
    })
  }, [])

  return {
    ...state,
    isStreaming,
    startSync,
    checkRunningSync,
    reset,
  }
}
