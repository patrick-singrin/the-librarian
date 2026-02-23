import { useQuery, useQueries, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { invalidateSyncQueries, invalidateSpaceQueries } from '../api/invalidation'
import type { SpaceCreateRequest, SpaceUpdateRequest } from '../types/api'

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces.list,
    queryFn: api.ragSpaces,
    refetchInterval: 300_000, // spaces rarely change
    placeholderData: keepPreviousData,
  })
}

/** Single-call aggregate for space tiles — one query key, instant cache. */
export function useSpacesOverview(paused = false) {
  return useQuery({
    queryKey: queryKeys.spaces.overview,
    queryFn: api.ragSpacesOverview,
    refetchInterval: paused ? false : 60_000,
    enabled: !paused,
    placeholderData: keepPreviousData,
  })
}

export function useCheckNew(spaceId?: string, paused = false) {
  return useQuery({
    queryKey: queryKeys.sync.checkNewBySpace(spaceId),
    queryFn: () => api.ragCheckNew(spaceId),
    refetchInterval: paused ? false : 60_000,
    enabled: !paused,
    placeholderData: keepPreviousData,
  })
}

export interface SpaceStats {
  indexed: number
  total: number
  newCount: number
}

/** Fetch per-space indexed/total counts in parallel. */
export function useSpaceStats(slugs: string[], paused = false) {
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: queryKeys.sync.checkNewBySpace(slug),
      queryFn: () => api.ragCheckNew(slug),
      refetchInterval: paused ? false : 60_000,
      enabled: !paused,
      placeholderData: keepPreviousData,
    })),
  })

  const map = new Map<string, SpaceStats>()
  slugs.forEach((slug, i) => {
    const data = results[i]?.data
    if (data) {
      map.set(slug, {
        indexed: data.total_indexed,
        total: Math.max(data.total_in_paperless, data.total_indexed),
        newCount: data.new_count,
      })
    }
  })

  return map
}

export function useSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ docIds, spaceId }: { docIds?: number[]; spaceId?: string } = {}) =>
      api.ragSync(docIds, spaceId),
    onSuccess: () => invalidateSyncQueries(queryClient),
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SpaceCreateRequest) => api.ragCreateSpace(body),
    onSuccess: () => invalidateSpaceQueries(queryClient),
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: SpaceUpdateRequest & { slug: string }) =>
      api.ragUpdateSpace(slug, body),
    onSuccess: () => invalidateSpaceQueries(queryClient),
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => api.ragDeleteSpace(slug),
    onSuccess: () => invalidateSpaceQueries(queryClient),
  })
}
