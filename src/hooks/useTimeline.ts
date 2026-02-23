import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { TimelineRange } from '../types/api'

export function useTimeline(range: TimelineRange) {
  return useQuery({
    queryKey: queryKeys.timeline.byRange(range),
    queryFn: () => api.timeline(range),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  })
}
