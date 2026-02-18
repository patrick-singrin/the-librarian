import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import type { TimelineRange } from '../types/api'

export function useTimeline(range: TimelineRange) {
  return useQuery({
    queryKey: ['timeline', range],
    queryFn: () => api.timeline(range),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  })
}
