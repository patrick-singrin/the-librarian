import { Router } from 'express'
import { listDocumentsWithTag } from '../services/paperless-client.js'
import { getMetaStatus, runMetaEnrich } from '../services/meta-runner.js'

export const metaRouter = Router()

const NEW_TAG_ID = 151

metaRouter.get('/pending', async (_req, res) => {
  try {
    const result = await listDocumentsWithTag(NEW_TAG_ID)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

metaRouter.post('/enrich', (_req, res) => {
  const status = getMetaStatus()
  if (status.running) {
    res.status(409).json({ ...status, error: 'Enrichment already running' })
    return
  }
  const result = runMetaEnrich()
  res.json({ message: 'Enrichment started', ...result })
})

metaRouter.get('/status', (_req, res) => {
  res.json(getMetaStatus())
})
