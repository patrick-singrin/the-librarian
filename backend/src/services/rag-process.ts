import { spawn, execSync, type ChildProcess } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { config, toolPaths } from '../config.js'

let ragProcess: ChildProcess | null = null
let ragReady = false

const RAG_PORT = '8088'

/**
 * Kill any orphaned process on the RAG port.
 * This handles the case where tsx watch restarts the backend
 * but the old RAG child process is still running.
 */
function killOrphanedRagProcess(): void {
  try {
    const pid = execSync(`lsof -ti:${RAG_PORT}`, { encoding: 'utf-8' }).trim()
    if (pid) {
      console.log(`Killing orphaned process ${pid} on port ${RAG_PORT}`)
      execSync(`kill ${pid}`)
    }
  } catch {
    // No process on port — expected
  }
}

/**
 * Starts the RAG FastAPI server as a managed child process using uvicorn.
 * Adapts Docker env vars for native Mac execution.
 */
export function startRagApi(): void {
  if (ragProcess) {
    console.log('RAG API process already running')
    return
  }

  killOrphanedRagProcess()

  const ragDir = toolPaths.ragApi
  const logsDir = join(ragDir, '..', 'logs')

  // Ensure logs directory exists (the app writes to logs/app.log)
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }

  // Build env vars for native (non-Docker) execution
  const ragEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    PAPERLESS_BASE_URL: config.paperlessUrl,
    PAPERLESS_API_TOKEN: config.paperlessToken,
    // LLM provider — URL and API key from settings
    OPENROUTER_BASE_URL: `${config.llmApiUrl}/v1`,
    OPENROUTER_API_KEY: config.llmApiKey || 'dummy',
    OPENROUTER_MODEL: 'ministral-3-14b',
    QDRANT_URL: config.qdrantUrl,
    COLLECTION_NAME: 'paperless_chunks',
    EMBEDDING_MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
    SERVER_HOST: '0.0.0.0',
    SERVER_PORT: '8088',
    ALLOWED_ORIGINS: 'http://localhost:3001,http://localhost:5173,http://127.0.0.1:3001',
    LOG_DIR: logsDir,
    LOG_LEVEL: 'INFO',
    PYTHONUNBUFFERED: '1',
  }

  console.log(`Starting RAG API from ${ragDir}...`)

  ragProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8088', '--log-level', 'info'],
    {
      cwd: ragDir,
      env: ragEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  ragProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) console.log(`[RAG] ${msg}`)
    if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
      ragReady = true
      console.log('RAG API is ready')
    }
  })

  ragProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) console.log(`[RAG] ${msg}`)
    // Uvicorn logs startup to stderr
    if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
      ragReady = true
      console.log('RAG API is ready')
    }
  })

  ragProcess.on('close', (code) => {
    if (code === 0) {
      console.log('RAG API process stopped cleanly')
    } else {
      console.warn(
        `RAG API process exited with code ${code}.` +
        (code === 3 ? ' This usually means a dependency (like Qdrant) was unreachable during startup.' : '') +
        ' Use the Settings page to restart it once the issue is resolved.',
      )
    }
    ragProcess = null
    ragReady = false
  })

  ragProcess.on('error', (err) => {
    console.error(`Failed to start RAG API: ${err.message}`)
    ragProcess = null
    ragReady = false
  })
}

export function stopRagApi(): void {
  if (ragProcess) {
    console.log('Stopping RAG API...')
    ragProcess.kill('SIGTERM')
    ragProcess = null
    ragReady = false
  }
}

export function restartRagApi(): void {
  stopRagApi()
  // Give the process a moment to release the port
  setTimeout(() => startRagApi(), 500)
}

export function isRagReady(): boolean {
  return ragReady
}

export function isRagRunning(): boolean {
  return ragProcess !== null
}

export type RagProcessStatus = 'running' | 'starting' | 'stopped'

export function getRagProcessStatus(): RagProcessStatus {
  if (!ragProcess) return 'stopped'
  return ragReady ? 'running' : 'starting'
}
