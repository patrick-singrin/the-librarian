import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'

export function useRagSearch() {
  return useMutation({
    mutationFn: (query: string) => api.ragAsk(query),
  })
}
