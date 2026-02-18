import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: api.overview,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}
