/**
 * Multi-source LLM registry.
 *
 * Persists an array of OpenAI-compatible LLM endpoints to
 * `backend/data/llm-sources.json`. Only one source is "active" at a time;
 * its credentials are injected into the RAG API child process at spawn.
 */

import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'
import { restartRagApi, getRagProcessStatus } from './rag-process.js'
import { invalidate } from './event-bus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '..', '..', 'data')
const FILE_PATH = resolve(DATA_DIR, 'llm-sources.json')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LlmSource {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  isActive: boolean
}

export type LlmSourceMasked = Omit<LlmSource, 'apiKey'> & { apiKey: string }

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readSources(): LlmSource[] {
  ensureDataDir()
  if (!existsSync(FILE_PATH)) return []
  try {
    return JSON.parse(readFileSync(FILE_PATH, 'utf-8'))
  } catch {
    return []
  }
}

function writeSources(sources: LlmSource[]): void {
  ensureDataDir()
  writeFileSync(FILE_PATH, JSON.stringify(sources, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Migration: seed from .env on first load
// ---------------------------------------------------------------------------

function ensureSources(): LlmSource[] {
  let sources = readSources()
  if (sources.length === 0 && config.llmApiUrl) {
    sources = [
      {
        id: randomUUID(),
        name: 'Default',
        baseUrl: config.llmApiUrl,
        apiKey: config.llmApiKey || '',
        model: 'ministral-3-14b',
        isActive: true,
      },
    ]
    writeSources(sources)
  }
  return sources
}

// ---------------------------------------------------------------------------
// Public read API
// ---------------------------------------------------------------------------

export function getAllSources(): LlmSource[] {
  return ensureSources()
}

export function getSourceById(id: string): LlmSource | undefined {
  return getAllSources().find((s) => s.id === id)
}

export function getActiveSource(): LlmSource | undefined {
  return getAllSources().find((s) => s.isActive)
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function createSource(
  data: Pick<LlmSource, 'name' | 'baseUrl' | 'apiKey' | 'model'>,
): LlmSource {
  const sources = getAllSources()
  const isFirst = sources.length === 0
  const newSource: LlmSource = {
    ...data,
    id: randomUUID(),
    isActive: isFirst,
  }
  sources.push(newSource)
  writeSources(sources)
  if (isFirst) applyActiveSource(newSource)
  return newSource
}

export function updateSource(
  id: string,
  data: Partial<Pick<LlmSource, 'name' | 'baseUrl' | 'apiKey' | 'model'>>,
): LlmSource {
  const sources = getAllSources()
  const source = sources.find((s) => s.id === id)
  if (!source) throw new Error('Source not found')

  if (data.name !== undefined) source.name = data.name
  if (data.baseUrl !== undefined) source.baseUrl = data.baseUrl
  if (data.apiKey !== undefined) source.apiKey = data.apiKey
  if (data.model !== undefined) source.model = data.model

  writeSources(sources)

  // Re-apply config + restart RAG if editing the active source
  if (source.isActive) {
    applyActiveSource(source)
    if (getRagProcessStatus() !== 'stopped') restartRagApi()
    invalidate('health', 'llm-sources')
  }

  return source
}

export function deleteSource(id: string): void {
  const sources = getAllSources()
  const source = sources.find((s) => s.id === id)
  if (!source) throw new Error('Source not found')
  if (source.isActive) throw new Error('Cannot delete the active source')
  writeSources(sources.filter((s) => s.id !== id))
}

export function activateSource(id: string): LlmSource {
  const sources = getAllSources()
  const target = sources.find((s) => s.id === id)
  if (!target) throw new Error('Source not found')
  if (target.isActive) return target // no-op

  for (const s of sources) s.isActive = s.id === id
  writeSources(sources)

  applyActiveSource(target)
  if (getRagProcessStatus() !== 'stopped') restartRagApi()
  invalidate('health', 'llm-sources', 'settings')
  return target
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export async function testSource(
  id: string,
): Promise<{ status: string; latencyMs: number; error?: string }> {
  const source = getSourceById(id)
  if (!source) throw new Error('Source not found')

  const start = Date.now()
  try {
    const headers: Record<string, string> = {}
    if (source.apiKey) headers['Authorization'] = `Bearer ${source.apiKey}`

    const res = await fetch(`${source.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(5000),
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Push active source values into the in-memory config object */
function applyActiveSource(source: LlmSource): void {
  config.llmApiUrl = source.baseUrl
  config.llmApiKey = source.apiKey
}

/** Mask the API key for wire responses */
export function maskSource(source: LlmSource): LlmSourceMasked {
  const key = source.apiKey
  if (!key) return { ...source, apiKey: '' }
  if (key.length <= 8) return { ...source, apiKey: '*'.repeat(key.length) }
  return {
    ...source,
    apiKey: `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`,
  }
}
