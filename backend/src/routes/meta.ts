import { Router } from 'express'
import { config } from '../config.js'
import { listDocumentsWithTag } from '../services/paperless-client.js'
import { getMetaStatus, runMetaEnrich, clearMetaJob } from '../services/meta-runner.js'

export const metaRouter = Router()

metaRouter.get('/pending', async (_req, res) => {
  try {
    const result = await listDocumentsWithTag(config.metaNewTagId)
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

metaRouter.post('/clear', (_req, res) => {
  clearMetaJob()
  res.json({ ok: true })
})
