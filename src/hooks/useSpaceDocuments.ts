import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useSpaceDocuments(spaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sync.indexedDocsBySpace(spaceId!),
    queryFn: () => api.ragIndexedDocuments(spaceId!),
    enabled: !!spaceId,
    refetchInterval: 120_000,
    placeholderData: keepPreviousData,
  })
}
