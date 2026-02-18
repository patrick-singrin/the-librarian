import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSpaceDocuments(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['rag-indexed-documents', spaceId],
    queryFn: () => api.ragIndexedDocuments(spaceId!),
    enabled: !!spaceId,
    placeholderData: keepPreviousData,
  })
}
