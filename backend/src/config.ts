import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')

/** Project root (two levels up from backend/src/) */
const projectRoot = resolve(__dirname, '..', '..')

dotenv.config({ path: envPath })

export interface Config {
  [key: string]: string | number
  port: number
  paperlessUrl: string
  paperlessToken: string
  ragApiUrl: string
  llmProvider: string
  llmApiUrl: string
  llmApiKey: string
  qdrantUrl: string
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  paperlessUrl: process.env.PAPERLESS_URL || '',
  paperlessToken: process.env.PAPERLESS_TOKEN || '',
  ragApiUrl: process.env.RAG_API_URL || 'http://localhost:8088',
  llmProvider: process.env.LLM_PROVIDER || 'lmstudio',
  llmApiUrl: process.env.LLM_API_URL || process.env.LM_STUDIO_URL || '',
  llmApiKey: process.env.LLM_API_KEY || '',
  qdrantUrl: process.env.QDRANT_URL || '',
}

/** Resolved paths to local tool directories (relative to project root) */
export const toolPaths = {
  ragApi: resolve(projectRoot, 'tools', 'rag-api'),
  meta: resolve(projectRoot, 'tools', 'meta'),
} as const

/** Map of config keys → .env variable names */
const envKeyMap: Record<string, string> = {
  paperlessUrl: 'PAPERLESS_URL',
  paperlessToken: 'PAPERLESS_TOKEN',
  llmProvider: 'LLM_PROVIDER',
  llmApiUrl: 'LLM_API_URL',
  llmApiKey: 'LLM_API_KEY',
  qdrantUrl: 'QDRANT_URL',
}

/** Writable config keys (excludes port and tool paths) */
export const writableKeys = Object.keys(envKeyMap)

/**
 * Update config values in memory and persist to .env file.
 */
export function updateConfig(updates: Record<string, string>): void {
  // Read current .env
  let envContent: string
  try {
    envContent = readFileSync(envPath, 'utf-8')
  } catch {
    envContent = ''
  }

  for (const [key, value] of Object.entries(updates)) {
    const envVar = envKeyMap[key]
    if (!envVar) continue

    // Update in-memory config
    config[key] = value

    // Update .env content
    const regex = new RegExp(`^${envVar}=.*$`, 'm')
    const line = `${envVar}=${value}`
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line)
    } else {
      envContent = envContent.trimEnd() + '\n' + line + '\n'
    }
  }

  writeFileSync(envPath, envContent, 'utf-8')
}
