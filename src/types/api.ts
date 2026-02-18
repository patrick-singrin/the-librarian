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

export interface RagStats {
  vector_database?: {
    collection_name?: string
    vectors_count?: number
    points_count?: number
    segments_count?: number
    status?: string
    error?: string
  }
  paperless_documents: number | 'unknown'
  embedding_model: string
  llm_model: string
  space_id?: string | null
  space_documents?: number
  space_chunks?: number
}

export interface CheckNewResponse {
  new_count: number
  new_documents: Array<{ id: number; title: string; created: string; file_type: string; spaces: string[] }>
  total_in_paperless: number
  total_indexed: number
  unassigned_count: number
  embedding_available: boolean
  llm_available: boolean
  space_id?: string | null
}

export interface SyncResponse {
  message: string
  new_documents: Array<{ id: number; title: string }>
  indexed_count: number
  skipped_count: number
  total_chunks: number
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
  rag: {
    indexedChunks: number | null
    collectionStatus: string | null
    totalIndexed: number | null
    totalInPaperless: number | null
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
