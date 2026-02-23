const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => request<import('../types/api.js').HealthResponse>('/api/health'),

  ragAsk: (query: string, spaceId?: string) =>
    request<import('../types/api.js').AskResponse>('/api/rag/ask', {
      method: 'POST',
      body: JSON.stringify({ query, space_id: spaceId }),
    }),

  ragCheckNew: (spaceId?: string) => {
    const qs = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
    return request<import('../types/api.js').CheckNewResponse>(`/api/rag/check-new${qs}`)
  },

  ragSync: (docIds?: number[], spaceId?: string) =>
    request<import('../types/api.js').SyncResponse>('/api/rag/sync', {
      method: 'POST',
      body: JSON.stringify({
        ...(docIds ? { doc_ids: docIds } : {}),
        ...(spaceId ? { space_id: spaceId } : {}),
      }),
    }),

  ragIndexedDocuments: (spaceId: string) => {
    const qs = `?space_id=${encodeURIComponent(spaceId)}`
    return request<import('../types/api.js').IndexedDocumentsResponse>(`/api/rag/indexed-documents${qs}`)
  },

  ragSpaces: () => request<import('../types/api.js').SpaceInfo[]>('/api/rag/spaces'),

  ragSpacesOverview: () =>
    request<import('../types/api.js').SpacesOverview>('/api/rag/spaces-overview'),

  ragCreateSpace: (body: import('../types/api.js').SpaceCreateRequest) =>
    request<import('../types/api.js').SpaceInfo[]>('/api/rag/spaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  ragUpdateSpace: (slug: string, body: import('../types/api.js').SpaceUpdateRequest) =>
    request<import('../types/api.js').SpaceInfo[]>(`/api/rag/spaces/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  ragDeleteSpace: (slug: string) =>
    request<import('../types/api.js').SpaceInfo[]>(`/api/rag/spaces/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }),

  metaPending: () => request<import('../types/api.js').PaperlessDocumentList>('/api/meta/pending'),

  metaEnrich: () =>
    request<{ message: string } & import('../types/api.js').MetaJob>('/api/meta/enrich', { method: 'POST' }),

  metaStatus: () => request<import('../types/api.js').MetaJob>('/api/meta/status'),

  metaClear: () =>
    request<{ ok: boolean }>('/api/meta/clear', { method: 'POST' }),

  overview: () => request<import('../types/api.js').OverviewStats>('/api/overview'),

  timeline: (range: import('../types/api.js').TimelineRange) =>
    request<import('../types/api.js').TimelineResponse>(`/api/overview/timeline?range=${range}`),

  getSettings: () => request<import('../types/api.js').Settings>('/api/settings'),

  updateSettings: (settings: Partial<import('../types/api.js').Settings>) =>
    request<import('../types/api.js').Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  testConnection: (service: string) =>
    request<import('../types/api.js').ConnectionTestResult>(`/api/settings/test/${service}`, {
      method: 'POST',
    }),

  ragProcessStatus: () =>
    request<import('../types/api.js').RagProcessInfo>('/api/settings/rag-process'),

  ragProcessAction: (action: 'start' | 'stop' | 'restart') =>
    request<{ status: string }>(`/api/settings/rag-process/${action}`, { method: 'POST' }),

  localToolsInfo: () =>
    request<import('../types/api.js').LocalToolsInfo>('/api/settings/local-tools'),

  /** Start a streaming sync. Returns the raw Response for ReadableStream access. */
  ragSyncStream: async (docIds?: number[], spaceId?: string): Promise<Response> => {
    const res = await fetch(`${BASE}/api/rag/sync/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(docIds ? { doc_ids: docIds } : {}),
        ...(spaceId ? { space_id: spaceId } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`)
    }
    return res
  },

  /** Polling fallback: get current sync job state. */
  ragSyncProgress: () =>
    request<import('../types/api.js').SyncJobProgress>('/api/rag/sync/progress'),

  /** Clear stored sync state after user acknowledges completion. */
  ragSyncClear: () =>
    request<{ ok: boolean }>('/api/rag/sync/clear', { method: 'POST' }),
}
