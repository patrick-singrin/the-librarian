/**
 * In-memory store for RAG sync job state.
 *
 * Tracks the latest sync run so that:
 *  - The SSE proxy can write progress as events arrive from the RAG API
 *  - GET /sync/progress can return the current state (polling fallback)
 */

export interface SyncDocProgress {
  doc_id: number
  title: string
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error'
  spaces: string[]
  chunks_created: number
  /** Reason for skip/failure (e.g. "already_exists", "no_spaces_assigned") */
  reason?: string
}

export interface SyncJobState {
  running: boolean
  startedAt: string | null
  total: number
  indexedCount: number
  failedCount: number
  totalChunks: number
  /** Per-document progress keyed by doc_id */
  docs: Map<number, SyncDocProgress>
  /** Final result (set on sync:complete) */
  result: {
    indexedDocuments: number[]
    failedDocuments: number[]
    indexedCount: number
    failedCount: number
    totalChunks: number
  } | null
  error: string | null
}

function freshState(): SyncJobState {
  return {
    running: false,
    startedAt: null,
    total: 0,
    indexedCount: 0,
    failedCount: 0,
    totalChunks: 0,
    docs: new Map(),
    result: null,
    error: null,
  }
}

let currentJob: SyncJobState = freshState()

/** Reset and mark a new sync as running. */
export function startSyncJob(): void {
  currentJob = freshState()
  currentJob.running = true
  currentJob.startedAt = new Date().toISOString()
}

/** Called when sync:start event arrives from RAG API. */
export function onSyncStart(data: {
  total: number
  doc_ids: number[]
  doc_meta: Record<string, { title: string; spaces: string[] }>
}): void {
  currentJob.total = data.total
  for (const docId of data.doc_ids) {
    const meta = data.doc_meta[String(docId)]
    currentJob.docs.set(docId, {
      doc_id: docId,
      title: meta?.title ?? `Document ${docId}`,
      status: 'pending',
      spaces: meta?.spaces ?? [],
      chunks_created: 0,
    })
  }
}

/** Called when sync:progress event arrives from RAG API. */
export function onSyncProgress(data: {
  doc_id: number
  title: string
  status: string
  spaces: string[]
  chunks_created: number
  indexed_count: number
  failed_count: number
  total: number
  reason?: string
}): void {
  currentJob.indexedCount = data.indexed_count
  currentJob.failedCount = data.failed_count
  currentJob.total = data.total

  const existing = currentJob.docs.get(data.doc_id)
  if (existing) {
    existing.status = data.status as SyncDocProgress['status']
    existing.chunks_created = data.chunks_created
    if (data.reason) existing.reason = data.reason
  } else {
    currentJob.docs.set(data.doc_id, {
      doc_id: data.doc_id,
      title: data.title,
      status: data.status as SyncDocProgress['status'],
      spaces: data.spaces,
      chunks_created: data.chunks_created,
      reason: data.reason,
    })
  }
}

/** Called when sync:complete event arrives from RAG API. */
export function onSyncComplete(data: {
  indexed_count: number
  failed_count: number
  total_chunks: number
  indexed_documents: number[]
  failed_documents: number[]
}): void {
  currentJob.running = false
  currentJob.indexedCount = data.indexed_count
  currentJob.failedCount = data.failed_count
  currentJob.totalChunks = data.total_chunks
  currentJob.result = {
    indexedDocuments: data.indexed_documents,
    failedDocuments: data.failed_documents,
    indexedCount: data.indexed_count,
    failedCount: data.failed_count,
    totalChunks: data.total_chunks,
  }
}

/** Called when the SSE connection errors out. */
export function onSyncError(message: string): void {
  currentJob.running = false
  currentJob.error = message
}

/** Clear the current sync state (called when the frontend acknowledges completion). */
export function clearSyncJob(): void {
  currentJob = freshState()
}

/** Return a JSON-safe snapshot of the current sync state. */
export function getSyncProgress(): Record<string, unknown> {
  return {
    running: currentJob.running,
    startedAt: currentJob.startedAt,
    total: currentJob.total,
    indexedCount: currentJob.indexedCount,
    failedCount: currentJob.failedCount,
    totalChunks: currentJob.totalChunks,
    docs: [...currentJob.docs.values()],
    result: currentJob.result,
    error: currentJob.error,
  }
}
