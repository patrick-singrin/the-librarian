// ---------------------------------------------------------------------------
// Shared invalidation helpers — DRY wrappers for common cache-bust patterns
// ---------------------------------------------------------------------------

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

/**
 * Invalidate all queries affected by a sync completing.
 *
 * Called after: stream complete, polling fallback complete, manual sync mutation.
 * Prefix-match on checkNew and indexedDocs covers all space-scoped variants.
 */
export function invalidateSyncQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.sync.checkNew })
  queryClient.invalidateQueries({ queryKey: queryKeys.sync.indexedDocs })
  queryClient.invalidateQueries({ queryKey: queryKeys.spaces.overview })
}

/**
 * Invalidate all queries affected by a space being created, updated, or deleted.
 *
 * Superset of `invalidateSyncQueries` — also busts the space list itself.
 */
export function invalidateSpaceQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.spaces.list })
  invalidateSyncQueries(queryClient)
}
