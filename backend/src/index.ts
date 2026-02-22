import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { healthRouter } from './routes/health.js'
import { ragRouter } from './routes/rag.js'
import { metaRouter } from './routes/meta.js'
import { overviewRouter } from './routes/overview.js'
import { settingsRouter } from './routes/settings.js'
import { startRagApi, stopRagApi } from './services/rag-process.js'
import { attachSSE } from './services/event-bus.js'

const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

// SSE event bus — frontend subscribes for real-time invalidation hints
app.get('/api/events', (_req, res) => attachSSE(res))

app.use('/api/health', healthRouter)
app.use('/api/rag', ragRouter)
app.use('/api/meta', metaRouter)
app.use('/api/overview', overviewRouter)
app.use('/api/settings', settingsRouter)

// Start the RAG API as a managed child process
startRagApi()

const server = app.listen(config.port, () => {
  console.log(`Librarian backend running on http://localhost:${config.port}`)
})

// Graceful shutdown
function shutdown() {
  console.log('Shutting down...')
  stopRagApi()
  server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
