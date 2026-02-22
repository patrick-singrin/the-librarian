import { config } from '../config.js'

async function ragFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${config.ragApiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    signal: options?.signal ?? AbortSignal.timeout(30000),
  })
}

export async function checkRagHealth(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await ragFetch('/health', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

export async function ragAsk(body: unknown): Promise<unknown> {
  const res = await ragFetch('/ask', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(120000) })
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragStats(spaceId?: string): Promise<unknown> {
  const qs = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
  const res = await ragFetch(`/stats${qs}`)
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragCheckNew(spaceId?: string): Promise<unknown> {
  const qs = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
  const res = await ragFetch(`/check-new${qs}`)
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragSync(body?: unknown): Promise<unknown> {
  const res = await ragFetch('/sync', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(300000),
  })
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

/**
 * Start a streaming sync via the RAG API's /sync-stream SSE endpoint.
 * Returns the raw Response so the caller can read its body as a stream.
 * Timeout is 10 minutes (large doc sets can take a while).
 */
export async function ragSyncStream(body?: unknown): Promise<Response> {
  const res = await ragFetch('/sync-stream', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(600000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `RAG API error: ${res.status}`)
  }
  return res
}

export async function ragIndexedDocuments(spaceId: string): Promise<unknown> {
  const res = await ragFetch(`/indexed-documents?space_id=${encodeURIComponent(spaceId)}`)
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragSpaces(): Promise<unknown> {
  const res = await ragFetch('/spaces')
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragCreateSpace(body: unknown): Promise<unknown> {
  const res = await ragFetch('/spaces', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `RAG API error: ${res.status}`)
  }
  return res.json()
}

export async function ragUpdateSpace(slug: string, body: unknown): Promise<unknown> {
  const res = await ragFetch(`/spaces/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `RAG API error: ${res.status}`)
  }
  return res.json()
}

export async function ragDeleteSpace(slug: string): Promise<unknown> {
  const res = await ragFetch(`/spaces/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `RAG API error: ${res.status}`)
  }
  return res.json()
}

export async function ragWipeSpace(slug: string): Promise<unknown> {
  const res = await ragFetch(`/spaces/${encodeURIComponent(slug)}/wipe`, {
    method: 'POST',
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `RAG API error: ${res.status}`)
  }
  return res.json()
}
