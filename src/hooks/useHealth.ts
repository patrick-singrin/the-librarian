import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health.all,
    queryFn: api.health,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })
}
