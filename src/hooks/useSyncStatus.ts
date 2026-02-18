import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSyncStats() {
  return useQuery({
    queryKey: ['rag-stats'],
    queryFn: api.ragStats,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useCheckNew() {
  return useQuery({
    queryKey: ['rag-check-new'],
    queryFn: api.ragCheckNew,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (docIds?: number[]) => api.ragSync(docIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-stats'] })
      queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
    },
  })
}
