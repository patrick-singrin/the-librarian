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

export async function ragStats(): Promise<unknown> {
  const res = await ragFetch('/stats')
  if (!res.ok) throw new Error(`RAG API error: ${res.status}`)
  return res.json()
}

export async function ragCheckNew(): Promise<unknown> {
  const res = await ragFetch('/check-new')
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
