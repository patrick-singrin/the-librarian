import { Router } from 'express'
import {
  getAllSources,
  createSource,
  updateSource,
  deleteSource,
  activateSource,
  testSource,
  maskSource,
  fetchModels,
  fetchModelsForSource,
} from '../services/llm-sources.js'

export const llmSourcesRouter = Router()

/** GET / — list all sources (API keys masked) */
llmSourcesRouter.get('/', (_req, res) => {
  res.json(getAllSources().map(maskSource))
})

/** POST / — create a new source */
llmSourcesRouter.post('/', (req, res) => {
  const { name, baseUrl, apiKey, model } = req.body
  if (!name || !baseUrl || !model) {
    res.status(400).json({ error: 'name, baseUrl, and model are required' })
    return
  }
  try {
    const source = createSource({ name, baseUrl, apiKey: apiKey || '', model })
    res.status(201).json(maskSource(source))
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** POST /discover-models — list models for arbitrary baseUrl + apiKey (used during "add source") */
llmSourcesRouter.post('/discover-models', async (req, res) => {
  const { baseUrl, apiKey } = req.body
  if (!baseUrl) {
    res.status(400).json({ error: 'baseUrl is required' })
    return
  }
  try {
    const models = await fetchModels(baseUrl, apiKey || '')
    res.json(models)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** PUT /:id — update a source */
llmSourcesRouter.put('/:id', (req, res) => {
  const { name, baseUrl, apiKey, model } = req.body
  const updates: Record<string, string> = {}
  if (name !== undefined) updates.name = name
  if (baseUrl !== undefined) updates.baseUrl = baseUrl
  if (apiKey !== undefined) updates.apiKey = apiKey
  if (model !== undefined) updates.model = model

  try {
    const source = updateSource(req.params.id, updates)
    res.json(maskSource(source))
  } catch (e) {
    res.status(404).json({ error: (e as Error).message })
  }
})

/** DELETE /:id — delete a source (fails if active) */
llmSourcesRouter.delete('/:id', (req, res) => {
  try {
    deleteSource(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** POST /:id/activate — set as active source, triggers RAG restart */
llmSourcesRouter.post('/:id/activate', (req, res) => {
  try {
    const source = activateSource(req.params.id)
    res.json(maskSource(source))
  } catch (e) {
    res.status(404).json({ error: (e as Error).message })
  }
})

/** POST /:id/test — test connection to this source */
llmSourcesRouter.post('/:id/test', async (req, res) => {
  try {
    const result = await testSource(req.params.id)
    res.json(result)
  } catch (e) {
    res.status(404).json({ error: (e as Error).message })
  }
})

/** GET /:id/models — list models available on an existing source */
llmSourcesRouter.get('/:id/models', async (req, res) => {
  try {
    const models = await fetchModelsForSource(req.params.id)
    res.json(models)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})
