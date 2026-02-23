import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview.all,
    queryFn: api.overview,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}
