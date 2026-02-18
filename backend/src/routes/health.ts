import { Router } from 'express'
import { checkPaperlessHealth } from '../services/paperless-client.js'
import { checkRagHealth } from '../services/rag-client.js'
import { checkLmStudioHealth, checkQdrantHealth } from '../services/lmstudio-client.js'
import { isRagRunning, isRagReady } from '../services/rag-process.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  const [paperless, rag, qdrant, lmStudio] = await Promise.allSettled([
    checkPaperlessHealth(),
    checkRagHealth(),
    checkQdrantHealth(),
    checkLmStudioHealth(),
  ])

  // If the RAG process is running but not yet ready (still loading model),
  // show "starting" instead of "down"
  let ragStatus = rag.status === 'fulfilled' ? rag.value : { status: 'down' as const, latencyMs: 0, error: 'Check failed' }
  if (ragStatus.status === 'down' && isRagRunning() && !isRagReady()) {
    ragStatus = { status: 'degraded' as const, latencyMs: 0, error: 'Starting up (loading model)...' }
  }

  const services = {
    paperless: paperless.status === 'fulfilled' ? paperless.value : { status: 'down', latencyMs: 0, error: 'Check failed' },
    rag: ragStatus,
    qdrant: qdrant.status === 'fulfilled' ? qdrant.value : { status: 'down', latencyMs: 0, error: 'Check failed' },
    lmStudio: lmStudio.status === 'fulfilled' ? lmStudio.value : { status: 'down', latencyMs: 0, error: 'Check failed' },
  }

  const statuses = Object.values(services).map((s) => s.status)
  const allHealthy = statuses.every((s) => s === 'healthy')
  const allDown = statuses.every((s) => s === 'down')

  res.json({
    overall: allHealthy ? 'healthy' : allDown ? 'down' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  })
})
