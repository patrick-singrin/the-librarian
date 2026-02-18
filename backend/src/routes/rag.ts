import { Router } from 'express'
import { ragAsk, ragStats, ragCheckNew, ragSync } from '../services/rag-client.js'

export const ragRouter = Router()

ragRouter.post('/ask', async (req, res) => {
  try {
    const result = await ragAsk(req.body)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.get('/stats', async (_req, res) => {
  try {
    const result = await ragStats()
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.get('/check-new', async (_req, res) => {
  try {
    const result = await ragCheckNew()
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

ragRouter.post('/sync', async (req, res) => {
  try {
    const result = await ragSync(req.body)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})
