/**
 * In-memory store for Meta enrichment job state.
 *
 * Tracks the latest enrichment run so that:
 *  - The stdout parser in meta-runner can write progress as events arrive
 *  - GET /api/meta/status can return per-document progress (polling)
 *
 * Mirrors the sync-progress.ts pattern used by the RAG pipeline.
 */

export type MetaDocStatus = 'pending' | 'processing' | 'success' | 'skipped' | 'error'

export interface MetaDocProgress {
  doc_id: number
  title: string
  status: MetaDocStatus
  confidence?: number
}

export interface MetaJobState {
  running: boolean
  startedAt: string | null
  total: number
  processedCount: number
  approvedCount: number
  skippedCount: number
  errorCount: number
  /** Per-document progress keyed by doc_id */
  docs: Map<number, MetaDocProgress>
  /** Raw stdout output (non-event lines) for the output display */
  output: string
  /** Stderr accumulator */
  error: string
  exitCode: number | null
}

function freshState(): MetaJobState {
  return {
    running: false,
    startedAt: null,
    total: 0,
    processedCount: 0,
    approvedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    docs: new Map(),
    output: '',
    error: '',
    exitCode: null,
  }
}

let currentJob: MetaJobState = freshState()

/** Reset and mark a new enrichment as running. */
export function startMetaJob(): void {
  currentJob = freshState()
  currentJob.running = true
  currentJob.startedAt = new Date().toISOString()
}

/** Called when meta:start event arrives from the Python script. */
export function onMetaStart(data: {
  total: number
  doc_ids: number[]
  doc_meta: Record<string, { title: string }>
}): void {
  currentJob.total = data.total
  for (const docId of data.doc_ids) {
    const meta = data.doc_meta[String(docId)]
    currentJob.docs.set(docId, {
      doc_id: docId,
      title: meta?.title ?? `Document ${docId}`,
      status: 'pending',
    })
  }
}

/** Called when meta:progress event arrives from the Python script. */
export function onMetaProgress(data: {
  doc_id: number
  title: string
  status: string
  processed_count: number
  approved_count: number
  skipped_count: number
  error_count: number
  total: number
  confidence?: number
}): void {
  currentJob.processedCount = data.processed_count
  currentJob.approvedCount = data.approved_count
  currentJob.skippedCount = data.skipped_count
  currentJob.errorCount = data.error_count
  currentJob.total = data.total

  const existing = currentJob.docs.get(data.doc_id)
  if (existing) {
    existing.status = data.status as MetaDocStatus
    if (data.confidence != null) existing.confidence = data.confidence
  } else {
    currentJob.docs.set(data.doc_id, {
      doc_id: data.doc_id,
      title: data.title,
      status: data.status as MetaDocStatus,
      confidence: data.confidence,
    })
  }
}

/** Called when meta:complete event arrives from the Python script. */
export function onMetaComplete(data: {
  processed_count: number
  approved_count: number
  skipped_count: number
  error_count: number
  total: number
}): void {
  currentJob.running = false
  currentJob.processedCount = data.processed_count
  currentJob.approvedCount = data.approved_count
  currentJob.skippedCount = data.skipped_count
  currentJob.errorCount = data.error_count
  currentJob.total = data.total
}

/** Called when the Python process errors out or crashes. */
export function onMetaError(message: string): void {
  currentJob.running = false
  currentJob.error += (currentJob.error ? '\n' : '') + message
}

/** Append non-event stdout text. */
export function appendOutput(text: string): void {
  currentJob.output += text
}

/** Append stderr text. */
export function appendStderr(text: string): void {
  currentJob.error += text
}

/** Set the process exit code. Ensures running is false. */
export function setMetaExitCode(code: number | null): void {
  currentJob.exitCode = code
  currentJob.running = false
}

/** Clear the current meta state (called when the frontend acknowledges completion). */
export function clearMetaJob(): void {
  currentJob = freshState()
}

/** Return a JSON-safe snapshot of the current meta state. */
export function getMetaProgress(): Record<string, unknown> {
  return {
    running: currentJob.running,
    startedAt: currentJob.startedAt,
    total: currentJob.total,
    processedCount: currentJob.processedCount,
    approvedCount: currentJob.approvedCount,
    skippedCount: currentJob.skippedCount,
    errorCount: currentJob.errorCount,
    docs: [...currentJob.docs.values()],
    output: currentJob.output,
    error: currentJob.error,
    exitCode: currentJob.exitCode,
  }
}
