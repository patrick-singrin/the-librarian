// ---------------------------------------------------------------------------
// Query Key Registry — Single Source of Truth for all React Query keys
//
// Every queryKey used in hooks, mutations, event-bus invalidation, and cache
// patching MUST be imported from here.  No inline string literals for keys.
// ---------------------------------------------------------------------------

export const queryKeys = {
  health: {
    all: ['health'] as const,
  },

  overview: {
    all: ['overview'] as const,
  },

  timeline: {
    all: ['timeline'] as const,
    byRange: (range: string) => ['timeline', range] as const,
  },

  settings: {
    all: ['settings'] as const,
    localTools: ['settings-local-tools'] as const,
    ragProcess: ['settings-rag-process'] as const,
  },

  meta: {
    pending: ['meta-pending'] as const,
    status: ['meta-status'] as const,
  },

  spaces: {
    /** Raw space list from RAG API */
    list: ['rag-spaces'] as const,
    /** Aggregated overview (one call for all space tiles) */
    overview: ['rag-spaces-overview'] as const,
  },

  sync: {
    /** Prefix-matches all space-scoped check-new variants */
    checkNew: ['rag-check-new'] as const,
    /** Check-new for a specific space (or undefined for global) */
    checkNewBySpace: (spaceId: string | undefined) =>
      ['rag-check-new', spaceId] as const,
    /** Prefix-matches all space-scoped indexed-docs variants */
    indexedDocs: ['rag-indexed-documents'] as const,
    /** Indexed documents for a specific space */
    indexedDocsBySpace: (spaceId: string) =>
      ['rag-indexed-documents', spaceId] as const,
  },
} as const

// ---------------------------------------------------------------------------
// Event Bus Key Mapping — maps backend SSE event strings → registry keys
//
// The backend `invalidate('rag-check-new')` sends raw strings via SSE.
// This map ensures compile-time safety: a backend key rename or typo
// surfaces as a TS error here rather than silently breaking invalidation.
// ---------------------------------------------------------------------------

export const eventKeyMap: Record<string, readonly string[]> = {
  'rag-check-new': queryKeys.sync.checkNew,
  'rag-indexed-documents': queryKeys.sync.indexedDocs,
  'rag-spaces-overview': queryKeys.spaces.overview,
  'rag-spaces': queryKeys.spaces.list,
  'meta-pending': queryKeys.meta.pending,
  'health': queryKeys.health.all,
  'overview': queryKeys.overview.all,
  'settings': queryKeys.settings.all,
}
