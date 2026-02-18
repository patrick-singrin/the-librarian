import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SpaceCreateRequest, SpaceUpdateRequest } from '../types/api'

export function useSpaces() {
  return useQuery({
    queryKey: ['rag-spaces'],
    queryFn: api.ragSpaces,
    refetchInterval: 300_000, // spaces rarely change
    placeholderData: keepPreviousData,
  })
}

export function useCheckNew(spaceId?: string) {
  return useQuery({
    queryKey: ['rag-check-new', spaceId],
    queryFn: () => api.ragCheckNew(spaceId),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ docIds, spaceId }: { docIds?: number[]; spaceId?: string } = {}) =>
      api.ragSync(docIds, spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
      queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
    },
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SpaceCreateRequest) => api.ragCreateSpace(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-spaces'] })
      queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
      queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: SpaceUpdateRequest & { slug: string }) =>
      api.ragUpdateSpace(slug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-spaces'] })
      queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
      queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
    },
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => api.ragDeleteSpace(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-spaces'] })
      queryClient.invalidateQueries({ queryKey: ['rag-check-new'] })
      queryClient.invalidateQueries({ queryKey: ['rag-indexed-documents'] })
    },
  })
}
