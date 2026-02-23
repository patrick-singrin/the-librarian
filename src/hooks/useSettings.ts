import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { Settings } from '../types/api'

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: api.getSettings,
    refetchInterval: 300_000, // settings rarely change externally
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<Settings>) => api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      // Tag setting affects which documents are considered "pending"
      queryClient.invalidateQueries({ queryKey: queryKeys.meta.pending })
    },
  })
}
