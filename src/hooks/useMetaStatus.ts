import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'

export function useMetaPending() {
  return useQuery({
    queryKey: ['meta-pending'],
    queryFn: api.metaPending,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useMetaEnrich() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.metaEnrich,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-pending'] })
    },
  })
}

export function useMetaJobStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['meta-status'],
    queryFn: api.metaStatus,
    refetchInterval: enabled ? 3_000 : false,
    enabled,
    placeholderData: keepPreviousData,
  })
}
