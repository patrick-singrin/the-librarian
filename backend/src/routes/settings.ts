import { Router } from 'express'
import { existsSync } from 'fs'
import { config, toolPaths, writableKeys, updateConfig } from '../config.js'
import { checkPaperlessHealth } from '../services/paperless-client.js'
import { checkRagHealth } from '../services/rag-client.js'
import { checkLmStudioHealth, checkQdrantHealth } from '../services/lmstudio-client.js'
import { startRagApi, stopRagApi, restartRagApi, getRagProcessStatus } from '../services/rag-process.js'

export const settingsRouter = Router()

/** Map of testable service keys → health check functions */
const serviceChecks: Record<string, () => Promise<{ status: string; latencyMs: number; error?: string }>> = {
  paperless: checkPaperlessHealth,
  rag: checkRagHealth,
  qdrant: checkQdrantHealth,
  llm: checkLmStudioHealth,
}

/**
 * POST /api/settings/test/:service
 * Test a single service connection. Returns { status, latencyMs, error? }.
 */
settingsRouter.post('/test/:service', async (req, res) => {
  const check = serviceChecks[req.params.service]
  if (!check) {
    res.status(400).json({ error: `Unknown service: ${req.params.service}` })
    return
  }
  try {
    const result = await check()
    res.json(result)
  } catch {
    res.json({ status: 'down', latencyMs: 0, error: 'Unexpected error' })
  }
})

// ---------------------------------------------------------------------------
// RAG process control
// ---------------------------------------------------------------------------

/** GET /api/settings/rag-process — current process status + path validity */
settingsRouter.get('/rag-process', (_req, res) => {
  res.json({
    status: getRagProcessStatus(),
    pathExists: existsSync(toolPaths.ragApi),
  })
})

/** POST /api/settings/rag-process/:action — start | stop | restart */
settingsRouter.post('/rag-process/:action', (req, res) => {
  const { action } = req.params
  switch (action) {
    case 'start':
      startRagApi()
      res.json({ status: 'starting' })
      break
    case 'stop':
      stopRagApi()
      res.json({ status: 'stopped' })
      break
    case 'restart':
      restartRagApi()
      res.json({ status: 'starting' })
      break
    default:
      res.status(400).json({ error: `Unknown action: ${action}` })
  }
})

// ---------------------------------------------------------------------------
// Local tools — path validation
// ---------------------------------------------------------------------------

/** GET /api/settings/local-tools — check if tool directories exist on disk */
settingsRouter.get('/local-tools', (_req, res) => {
  res.json({
    ragApi: { path: toolPaths.ragApi, exists: existsSync(toolPaths.ragApi) },
    meta: { path: toolPaths.meta, exists: existsSync(toolPaths.meta) },
  })
})

/**
 * GET /api/settings
 * Returns all writable config values (unmasked).
 * Safe for this app — backend and frontend both run on localhost.
 */
settingsRouter.get('/', (_req, res) => {
  const settings: Record<string, string> = {}

  for (const key of writableKeys) {
    settings[key] = String(config[key] ?? '')
  }

  res.json(settings)
})

/**
 * PUT /api/settings
 * Accepts a partial object of config key/value pairs.
 */
settingsRouter.put('/', (req, res) => {
  const body = req.body as Record<string, unknown>

  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Request body must be a JSON object' })
    return
  }

  const updates: Record<string, string> = {}

  for (const [key, value] of Object.entries(body)) {
    if (!writableKeys.includes(key)) continue
    if (typeof value !== 'string') continue
    updates[key] = value
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid settings to update' })
    return
  }

  updateConfig(updates)

  // Return the updated settings
  const settings: Record<string, string> = {}
  for (const key of writableKeys) {
    settings[key] = String(config[key] ?? '')
  }

  res.json(settings)
})
