import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { LlmSourceCreateRequest, LlmSourceUpdateRequest } from '../types/api'

export function useLlmSources() {
  return useQuery({
    queryKey: queryKeys.llmSources.all,
    queryFn: api.llmSources,
  })
}

export function useCreateLlmSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LlmSourceCreateRequest) => api.createLlmSource(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.llmSources.all }),
  })
}

export function useUpdateLlmSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LlmSourceUpdateRequest }) =>
      api.updateLlmSource(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.llmSources.all })
      qc.invalidateQueries({ queryKey: queryKeys.health.all })
    },
  })
}

export function useDeleteLlmSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteLlmSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.llmSources.all }),
  })
}

export function useActivateLlmSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.activateLlmSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.llmSources.all })
      qc.invalidateQueries({ queryKey: queryKeys.health.all })
      qc.invalidateQueries({ queryKey: queryKeys.settings.ragProcess })
    },
  })
}
