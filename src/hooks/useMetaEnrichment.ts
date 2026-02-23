import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMetaPending, useMetaEnrich, useMetaJobStatus } from './useMetaStatus'
import { queryKeys } from '../api/queryKeys'

export type MetaPhase = 'idle' | 'running' | 'completed'

/**
 * Encapsulates the full meta-enrichment lifecycle in a single hook.
 *
 * Mirrors the `useSyncStream` pattern: the page component reads derived state
 * and wires callbacks — no enrichment logic leaks into the component.
 *
 * Composes existing lower-level hooks:
 *  - `useMetaPending`   → pending document list + count
 *  - `useMetaEnrich`    → POST /api/meta/enrich mutation
 *  - `useMetaJobStatus` → polling GET /api/meta/status (3 s while running)
 */
export function useMetaEnrichment() {
  const queryClient = useQueryClient()
  const pending = useMetaPending()
  const enrich = useMetaEnrich()
  const [jobStarted, setJobStarted] = useState(false)
  const jobStatus = useMetaJobStatus(jobStarted)

  const docs = pending.data?.results ?? []
  const count = pending.data?.count ?? 0
  const loading = pending.isLoading

  const isRunning = jobStatus.data?.running ?? false
  const jobDone = jobStarted && jobStatus.data != null && !isRunning && jobStatus.data.exitCode !== null
  const jobSucceeded = jobDone && jobStatus.data?.exitCode === 0

  // Derive phase
  const phase: MetaPhase = isRunning
    ? 'running'
    : jobDone
      ? 'completed'
      : 'idle'

  const startEnrich = useCallback(() => {
    setJobStarted(true)
    enrich.mutate(undefined)
  }, [enrich])

  const acknowledge = useCallback(async () => {
    // Clear backend state FIRST so stale results can't race with the next start
    try {
      await api.metaClear()
    } catch {
      // Best effort — continue with reset even if clear fails
    }
    setJobStarted(false)
    queryClient.invalidateQueries({ queryKey: queryKeys.meta.pending })
  }, [queryClient])

  const refresh = useCallback(() => {
    pending.refetch()
  }, [pending])

  return {
    phase,
    docs,
    count,
    loading,
    isRunning,
    jobSucceeded,
    output: jobStatus.data?.output ?? null,
    error: jobStatus.data?.error ?? null,
    enrichError: enrich.error,
    dataUpdatedAt: pending.dataUpdatedAt || null,
    isFetching: pending.isFetching,
    startEnrich,
    acknowledge,
    refresh,
  }
}
