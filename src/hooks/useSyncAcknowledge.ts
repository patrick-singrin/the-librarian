import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { SpacesOverview, CheckNewResponse } from '../types/api'

/**
 * Encapsulates the optimistic cache patch + stream reset that happens when
 * the user acknowledges a completed sync ("Continue" button).
 *
 * Also clears the backend's in-memory sync state so that `checkRunningSync`
 * won't restore stale completion data on next mount.
 *
 * Keeps cache-patching knowledge out of page components.
 */
export function useSyncAcknowledge(stream: {
  indexedBySpace: Map<string, number>
  indexedCount: number
  reset: () => void
}): () => Promise<void> {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    // Clear backend sync state FIRST so checkRunningSync won't resurrect stale results
    try {
      await api.ragSyncClear()
    } catch {
      // Best effort — continue with reset even if clear fails
    }

    // Patch spaces-overview: apply stream deltas to cached baseline
    queryClient.setQueryData<SpacesOverview>(
      queryKeys.spaces.overview,
      (old) => {
        if (!old) return old
        return {
          ...old,
          spaces: old.spaces.map((entry) => {
            const delta = stream.indexedBySpace.get(entry.slug) ?? 0
            const indexed = entry.indexed + delta
            return { ...entry, indexed, newCount: Math.max(0, entry.newCount - delta) }
          }),
        }
      },
    )

    // Patch check-new: clear the pipeline queue
    queryClient.setQueryData<CheckNewResponse>(
      queryKeys.sync.checkNewBySpace(undefined),
      (old) => {
        if (!old) return old
        return {
          ...old,
          new_count: 0,
          new_documents: [],
          total_indexed: old.total_indexed + stream.indexedCount,
        }
      },
    )

    stream.reset()
  }, [queryClient, stream])
}
