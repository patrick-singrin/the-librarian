import { config } from '../config.js'

const headers = {
  Authorization: `Token ${config.paperlessToken}`,
  'Content-Type': 'application/json',
}

export async function checkPaperlessHealth(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await fetch(`${config.paperlessUrl}/api/`, { headers, signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

export async function listDocumentsWithTag(tagId: number): Promise<unknown> {
  const res = await fetch(
    `${config.paperlessUrl}/api/documents/?tags__id__in=${tagId}&page_size=100`,
    { headers, signal: AbortSignal.timeout(15000) },
  )
  if (!res.ok) throw new Error(`Paperless API error: ${res.status}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// Overview / Statistics helpers
// ---------------------------------------------------------------------------

async function paperlessFetch(path: string): Promise<unknown> {
  const res = await fetch(`${config.paperlessUrl}${path}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Paperless API error: ${res.status}`)
  return res.json()
}

/** Built-in Paperless statistics endpoint */
export async function getPaperlessStatistics(): Promise<Record<string, unknown>> {
  return paperlessFetch('/api/statistics/') as Promise<Record<string, unknown>>
}

/** Tags ordered by document count (descending) */
export async function getTopTags(limit = 100): Promise<unknown> {
  return paperlessFetch(`/api/tags/?page_size=${limit}&ordering=-document_count`)
}

/** Correspondents ordered by document count (descending) */
export async function getTopCorrespondents(limit = 100): Promise<unknown> {
  return paperlessFetch(`/api/correspondents/?page_size=${limit}&ordering=-document_count`)
}

/** Document types ordered by document count (descending) */
export async function getDocumentTypes(limit = 100): Promise<unknown> {
  return paperlessFetch(`/api/document_types/?page_size=${limit}&ordering=-document_count`)
}

/** Count of documents matching a filter (uses page_size=1 for speed) */
async function countDocuments(filter: string): Promise<number> {
  const data = (await paperlessFetch(
    `/api/documents/?${filter}&page=1&page_size=1`,
  )) as { count: number }
  return data.count
}

export const countUntagged = () => countDocuments('tags__isnull=true')
export const countNoCorrespondent = () => countDocuments('correspondent__isnull=true')
export const countNoDocumentType = () => countDocuments('document_type__isnull=true')

export function countDocumentsThisMonth(): Promise<number> {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  return countDocuments(`created__date__gte=${firstOfMonth}`)
}

// ---------------------------------------------------------------------------
// Document timeline (for Overview chart)
// ---------------------------------------------------------------------------

export type TimelineRange = '30d' | '6m' | '12m'

interface TimelineBucket {
  date: string
  count: number
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Get the Monday of the ISO week containing `d` */
function toMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  copy.setDate(copy.getDate() + diff)
  return copy
}

export async function getDocumentTimeline(range: TimelineRange): Promise<TimelineBucket[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let startDate: Date
  let allBuckets: string[]
  let bucketFn: (created: string) => string

  if (range === '30d') {
    startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 29)
    allBuckets = []
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      allBuckets.push(formatDate(d))
    }
    bucketFn = (created) => created.slice(0, 10)

  } else if (range === '6m') {
    startDate = new Date(today)
    startDate.setMonth(startDate.getMonth() - 6)
    const mondayStart = toMonday(startDate)
    const mondayEnd = toMonday(today)
    allBuckets = []
    for (let d = new Date(mondayStart); d <= mondayEnd; d.setDate(d.getDate() + 7)) {
      allBuckets.push(formatDate(d))
    }
    startDate = mondayStart
    bucketFn = (created) => formatDate(toMonday(new Date(created)))

  } else {
    // 12m
    startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    allBuckets = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
      allBuckets.push(formatMonth(d))
    }
    bucketFn = (created) => created.slice(0, 7)
  }

  const data = (await paperlessFetch(
    `/api/documents/?fields=id,created&ordering=created&created__date__gte=${formatDate(startDate)}&page_size=100000`,
  )) as { results: Array<{ id: number; created: string }> }

  const counts = new Map<string, number>()
  for (const bucket of allBuckets) counts.set(bucket, 0)
  for (const doc of data.results) {
    const key = bucketFn(doc.created)
    if (counts.has(key)) {
      counts.set(key, counts.get(key)! + 1)
    }
  }

  return allBuckets.map((date) => ({ date, count: counts.get(date) ?? 0 }))
}
