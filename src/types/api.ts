export type ServiceStatus = 'healthy' | 'degraded' | 'down'

export interface ServiceHealth {
  status: ServiceStatus
  latencyMs: number
  error?: string
}

export interface HealthResponse {
  overall: ServiceStatus
  services: {
    paperless: ServiceHealth
    rag: ServiceHealth
    qdrant: ServiceHealth
    lmStudio: ServiceHealth
  }
  timestamp: string
}

export interface Citation {
  doc_id: number
  title: string
  page: number | null
  score: number
  url: string | null
  snippet: string
}

export interface AskResponse {
  answer: string
  citations: Citation[]
  query: string
  model_used: string
}

export interface CheckNewResponse {
  new_count: number
  new_documents: Array<{ id: number; title: string; created?: string; file_type?: string; spaces: string[] }>
  total_in_paperless: number
  total_indexed: number
  unassigned_count: number
  embedding_available: boolean
  llm_available: boolean
  embedding_model?: string | null
  llm_model?: string | null
  space_id?: string | null
}

export interface SyncResponse {
  message: string
  new_documents: Array<{ id: number; title: string }>
  indexed_count: number
  skipped_count: number
  total_chunks: number
}

export interface IndexedDocument {
  doc_id: number
  title: string
  file_type: string
  ingested_at: string
  chunk_count: number
}

export interface IndexedDocumentsResponse {
  space_id: string
  documents: IndexedDocument[]
  total: number
}

export interface PaperlessDocument {
  id: number
  title: string
  created: string
  modified: string
  original_file_name: string
  tags: number[]
}

export interface PaperlessDocumentList {
  count: number
  results: PaperlessDocument[]
}

export interface OverviewStats {
  paperless: {
    totalDocuments: number
    inboxDocuments: number
    addedThisMonth: number
    totalTags: number
    totalCorrespondents: number
    totalDocumentTypes: number
    characterCount: number
    fileTypes: Array<{ mimeType: string; count: number }>
    topTags: Array<{ name: string; count: number; color: string }>
    topCorrespondents: Array<{ name: string; count: number }>
    documentTypes: Array<{ name: string; count: number }>
    missingMetadata: {
      untagged: number
      noCorrespondent: number
      noDocumentType: number
    }
  }
}

export type TimelineRange = '30d' | '6m' | '12m'

export interface TimelineBucket {
  date: string
  count: number
}

export interface TimelineResponse {
  range: TimelineRange
  buckets: TimelineBucket[]
}

export interface MetaJob {
  running: boolean
  startedAt: string | null
  output: string
  error: string
  exitCode: number | null
}

export interface Settings {
  paperlessUrl: string
  paperlessToken: string
  llmProvider: string
  llmApiUrl: string
  llmApiKey: string
  qdrantUrl: string
  metaNewTagId: string
  metaNewTagName: string
}

export interface ConnectionTestResult {
  status: 'healthy' | 'down' | 'degraded'
  latencyMs: number
  error?: string
}

export type RagProcessStatus = 'running' | 'starting' | 'stopped'

export interface RagProcessInfo {
  status: RagProcessStatus
  pathExists: boolean
}

// ---------------------------------------------------------------------------
// Spaces overview (single-call aggregate for space tiles)
// ---------------------------------------------------------------------------

export interface SpaceOverviewEntry {
  slug: string
  name: string
  indexed: number
  total: number
  newCount: number
}

export interface SpacesOverview {
  spaces: SpaceOverviewEntry[]
  timestamp: string
}

export interface SpaceParams {
  chunk_tokens: number
  chunk_overlap: number
  top_k: number
  score_threshold: number
}

export interface SpaceInfo {
  slug: string
  name: string
  params: SpaceParams
}

export interface SpaceCreateRequest {
  slug: string
  name: string
  chunk_tokens?: number
  chunk_overlap?: number
  top_k?: number
  score_threshold?: number
}

export interface SpaceUpdateRequest {
  name?: string
  chunk_tokens?: number
  chunk_overlap?: number
  top_k?: number
  score_threshold?: number
}

export interface LocalToolsInfo {
  ragApi: { path: string; exists: boolean }
  meta: { path: string; exists: boolean }
}

// ---------------------------------------------------------------------------
// Sync SSE types
// ---------------------------------------------------------------------------

export interface SyncStartEvent {
  total: number
  doc_ids: number[]
  doc_meta: Record<string, { title: string; spaces: string[] }>
}

export interface SyncProgressEvent {
  doc_id: number
  title: string
  status: 'success' | 'skipped' | 'error'
  spaces: string[]
  chunks_created: number
  indexed_count: number
  failed_count: number
  total: number
}

export interface SyncCompleteEvent {
  indexed_count: number
  failed_count: number
  total_chunks: number
  indexed_documents: number[]
  failed_documents: number[]
}

export interface SyncErrorEvent {
  error: string
}

export type SyncSSEEvent =
  | { event: 'sync:start'; data: SyncStartEvent }
  | { event: 'sync:progress'; data: SyncProgressEvent }
  | { event: 'sync:complete'; data: SyncCompleteEvent }
  | { event: 'sync:error'; data: SyncErrorEvent }

export interface SyncDocProgress {
  doc_id: number
  title: string
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error'
  spaces: string[]
  chunks_created: number
}

export interface SyncJobProgress {
  running: boolean
  startedAt: string | null
  total: number
  indexedCount: number
  failedCount: number
  totalChunks: number
  docs: SyncDocProgress[]
  result: {
    indexedDocuments: number[]
    failedDocuments: number[]
    indexedCount: number
    failedCount: number
    totalChunks: number
  } | null
  error: string | null
}
