import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

/**
 * Local tool path info (RAG API + Meta script existence).
 * Polls every 10 s — paths rarely change.
 */
export function useLocalToolsInfo() {
  return useQuery({
    queryKey: queryKeys.settings.localTools,
    queryFn: api.localToolsInfo,
    refetchInterval: 10_000,
  })
}

/**
 * RAG child-process status (running / starting / stopped).
 * Polls every 5 s for responsive start/stop feedback.
 */
export function useRagProcessStatus() {
  return useQuery({
    queryKey: queryKeys.settings.ragProcess,
    queryFn: api.ragProcessStatus,
    refetchInterval: 5_000,
  })
}

/**
 * Start / stop / restart the RAG child process.
 * Invalidates the process status query on success.
 */
export function useRagProcessAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart') =>
      api.ragProcessAction(action),
    onSuccess: () => {
      // Give the process a moment to transition, then refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.ragProcess })
      }, 800)
    },
  })
}
