import { config } from '../config.js'

export async function checkLmStudioHealth(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await fetch(`${config.llmApiUrl}/v1/models`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

export async function checkQdrantHealth(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await fetch(`${config.qdrantUrl}/collections`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}
