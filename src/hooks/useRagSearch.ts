import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'

export function useRagSearch() {
  return useMutation({
    mutationFn: ({ query, spaceId }: { query: string; spaceId?: string }) =>
      api.ragAsk(query, spaceId),
  })
}
