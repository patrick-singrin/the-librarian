import { Router } from 'express'
import {
  getPaperlessStatistics,
  getTopTags,
  getTopCorrespondents,
  getDocumentTypes,
  countUntagged,
  countNoCorrespondent,
  countNoDocumentType,
  countDocumentsThisMonth,
  getDocumentTimeline,
  type TimelineRange,
} from '../services/paperless-client.js'

export const overviewRouter = Router()

overviewRouter.get('/timeline', async (req, res) => {
  const range = (req.query.range as string) ?? '30d'
  const valid: TimelineRange[] = ['30d', '6m', '12m']
  if (!valid.includes(range as TimelineRange)) {
    res.status(400).json({ error: `Invalid range. Use: ${valid.join(', ')}` })
    return
  }
  try {
    const buckets = await getDocumentTimeline(range as TimelineRange)
    res.json({ range, buckets })
  } catch (e) {
    res.status(502).json({ error: (e as Error).message })
  }
})

overviewRouter.get('/', async (_req, res) => {
  const [
    statsResult,
    tagsResult,
    corrsResult,
    typesResult,
    untaggedResult,
    noCorrResult,
    noTypeResult,
    thisMonthResult,
  ] = await Promise.allSettled([
    getPaperlessStatistics(),
    getTopTags(8),
    getTopCorrespondents(8),
    getDocumentTypes(),
    countUntagged(),
    countNoCorrespondent(),
    countNoDocumentType(),
    countDocumentsThisMonth(),
  ])

  // Extract Paperless built-in statistics
  const pStats =
    statsResult.status === 'fulfilled'
      ? (statsResult.value as Record<string, unknown>)
      : {}

  const fileTypeCounts = (
    pStats.document_file_type_counts as Array<{ mime_type: string; mime_type_count: number }> | undefined
  ) ?? []

  // Extract tag list
  const tagsData =
    tagsResult.status === 'fulfilled'
      ? ((tagsResult.value as { results?: unknown[] }).results ?? [])
      : []

  const topTags = (tagsData as Array<{ name: string; document_count: number; color: string }>)
    .filter((t) => t.document_count > 0)
    .slice(0, 8)
    .map((t) => ({ name: t.name, count: t.document_count, color: t.color || '' }))

  // Extract correspondents
  const corrsData =
    corrsResult.status === 'fulfilled'
      ? ((corrsResult.value as { results?: unknown[] }).results ?? [])
      : []

  const topCorrespondents = (corrsData as Array<{ name: string; document_count: number }>)
    .filter((c) => c.document_count > 0)
    .slice(0, 8)
    .map((c) => ({ name: c.name, count: c.document_count }))

  // Extract document types
  const typesData =
    typesResult.status === 'fulfilled'
      ? ((typesResult.value as { results?: unknown[] }).results ?? [])
      : []

  const documentTypes = (typesData as Array<{ name: string; document_count: number }>)
    .filter((d) => d.document_count > 0)
    .map((d) => ({ name: d.name, count: d.document_count }))

  res.json({
    paperless: {
      totalDocuments: (pStats.documents_total as number) ?? 0,
      inboxDocuments: (pStats.documents_inbox as number) ?? 0,
      addedThisMonth: thisMonthResult.status === 'fulfilled' ? thisMonthResult.value : 0,
      totalTags: (pStats.tag_count as number) ?? 0,
      totalCorrespondents: (pStats.correspondent_count as number) ?? 0,
      totalDocumentTypes: (pStats.document_type_count as number) ?? 0,
      characterCount: (pStats.character_count as number) ?? 0,
      fileTypes: fileTypeCounts.map((f) => ({ mimeType: f.mime_type, count: f.mime_type_count })),
      topTags,
      topCorrespondents,
      documentTypes,
      missingMetadata: {
        untagged: untaggedResult.status === 'fulfilled' ? untaggedResult.value : 0,
        noCorrespondent: noCorrResult.status === 'fulfilled' ? noCorrResult.value : 0,
        noDocumentType: noTypeResult.status === 'fulfilled' ? noTypeResult.value : 0,
      },
    },
  })
})
