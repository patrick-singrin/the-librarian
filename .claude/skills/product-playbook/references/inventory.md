# Project Inventory
Generated: 2026-02-18
Source files: src/index.css, src/components/ui/index.ts, src/hooks/*.ts, src/types/api.ts, src/api/client.ts

---

## Design Tokens

All tokens defined in `src/index.css` under `@theme static`. Tailwind v4 CSS-first config.

### Fonts (3)

| Token | Value |
|---|---|
| `--font-sans` | "Atkinson Hyperlegible Next", system-ui, sans-serif |
| `--font-serif` | "Literata", Georgia, serif |
| `--font-mono` | "Atkinson Hyperlegible Mono", ui-monospace, monospace |

### Color Roles (6 roles + focus + status)

Each role provides a systematic set of tokens across 6 sub-groups: background, foreground, subtle-background, subtle-foreground, p-background (prominent), p-foreground, border, subtle-border. Each sub-group has 4 states: default, hover, active, disabled.

| Role | Tailwind Palette | Token Count | Example Token |
|---|---|---|---|
| **base** | slate/gray | 32 | `--color-base-foreground-default` |
| **primary** | blue | 32 | `--color-primary-p-background-default` |
| **success** | green | 32 | `--color-success-foreground-default` |
| **warning** | amber | 32 | `--color-warning-subtle-background-hover` |
| **error** | red | 32 | `--color-error-border-default` |
| **info** | teal | 32 | `--color-info-p-foreground-default` |

**Total role tokens: 192**

### Token Sub-Groups Per Role (8 sub-groups x 4 states = 32 tokens)

| Sub-Group | Pattern | Usage |
|---|---|---|
| `background` | `--color-{role}-background-{state}` | Default surface backgrounds |
| `foreground` | `--color-{role}-foreground-{state}` | Text/icon on default backgrounds |
| `subtle-background` | `--color-{role}-subtle-background-{state}` | Muted / tinted backgrounds |
| `subtle-foreground` | `--color-{role}-subtle-foreground-{state}` | Text/icon on subtle backgrounds |
| `p-background` | `--color-{role}-p-background-{state}` | Prominent/filled backgrounds (buttons, badges) |
| `p-foreground` | `--color-{role}-p-foreground-{state}` | Text/icon on prominent backgrounds |
| `border` | `--color-{role}-border-{state}` | Standard borders |
| `subtle-border` | `--color-{role}-subtle-border-{state}` | Light / secondary borders |

### Special Tokens (4)

| Token | Value | Usage |
|---|---|---|
| `--color-focus` | `var(--color-teal-500)` | Focus ring outline |
| `--color-status-healthy` | `oklch(0.55 0.17 145)` | Service health indicator |
| `--color-status-degraded` | `oklch(0.70 0.15 85)` | Service health indicator |
| `--color-status-down` | `oklch(0.55 0.22 27)` | Service health indicator |

**Grand total: 199 color tokens (192 role + 4 special + 3 font)**

---

## UI Components

16 components exported from `src/components/ui/index.ts`.

| Component | Key Props | Variants / Sizes | Composes |
|---|---|---|---|
| **Button** | `variant`, `size`, `iconLeft`, `iconRight`, `children`, `aria-label` | Variants: `primary-solid`, `primary-outline`, `primary-ghost`, `base-solid`, `base-outline`, `base-ghost`, `destructive-solid`, `destructive-outline`, `destructive-ghost` (9). Sizes: `sm`, `md`, `lg` | React Aria `Button` |
| **Icon** | `icon`, `size`, `color`, `alt` | Sizes: `xs` (12px), `sm` (16px), `md` (20px), `lg` (24px), `xl` (32px bold) | Phosphor Icons |
| **Card** | `as`, `padding`, `children` | Padding: `sm` (p-4), `md` (p-5) | -- |
| **Badge** | `variant`, `type`, `size`, `indicator`, `icon`, `children` | Variants: `base`, `primary`, `success`, `warning`, `error`, `info` (6). Types: `solid`, `outline` (2). Sizes: `sm` (32px), `xs` (24px) | Indicator, Icon |
| **StatTile** | `label`, `value`, `loading`, `align` | Align: `left`, `center` | Card |
| **WarnTile** | `label`, `value` | -- (single warning style) | -- |
| **Indicator** | `variant`, `size` | Variants: `success`, `warning`, `error`, `info` (4). Sizes: `xs` (10px), `sm` (12px) | -- |
| **Tooltip** | `children`, `content`, `placement`, `delay`, `closeDelay` | Placement: `top`, `bottom`, `left`, `right` | React Aria `Tooltip`, `OverlayArrow` |
| **Tile** | `title`, `icon`, `badge`, `children`, `updatedAt` | -- (single style) | Badge, Icon |
| **KpiTile** | `title`, `value`, `loading`, `icon`, `badge`, `updatedAt`, `description` | -- (single style) | Tile |
| **NavItem** | `href`, `label`, `icon`, `active`, `collapsed`, `disabled` | States: default, active, collapsed, disabled | React Aria `Link`, Icon |
| **IconButton** | `icon`, `iconRight`, `children`, `variant`, `aria-label` | Variants: `ghost`. Modes: icon-only (24x24), with-text (h-6) | React Aria `Button` |
| **Label** | `children`, `htmlFor`, `required`, `infoTip`, `helperText`, `infoIcon` | Required: shows `*`. Optional: shows "(Optional)" | IconButton, Tooltip |
| **InputItem** | `error`, `prefix`, `suffix`, + native input attrs | States: default, error, disabled. 40px height | -- (forwardRef) |
| **TextField** | `label`, `required`, `infoTip`, `helperText`, `infoIcon`, `errorText`, `prefix`, `suffix` | States: default, error | Label, InputItem |
| **Select** | `items`, `children`, `aria-label`, + React Aria SelectProps | -- (generic `<T>`) | React Aria `Select`, `ListBox`, `Popover` |
| **SelectItem** | ListBoxItemProps | States: default, focused, selected | React Aria `ListBoxItem` |

---

## Data Hooks

All hooks in `src/hooks/`. TanStack React Query for server state.

### Query Hooks

| Hook | File | Query Key | Interval | Returns |
|---|---|---|---|---|
| `useHealth` | useHealth.ts | `['health']` | 30 s | `UseQueryResult<HealthResponse>` |
| `useOverview` | useOverview.ts | `['overview']` | 60 s | `UseQueryResult<OverviewStats>` |
| `useTimeline` | useTimeline.ts | `['timeline', range]` | 120 s | `UseQueryResult<TimelineResponse>` |
| `useMetaPending` | useMetaStatus.ts | `['meta-pending']` | 60 s | `UseQueryResult<PaperlessDocumentList>` |
| `useMetaJobStatus` | useMetaStatus.ts | `['meta-status']` | 3 s (when enabled) | `UseQueryResult<MetaJob>` |
| `useSettings` | useSettings.ts | `['settings']` | 300 s | `UseQueryResult<Settings>` |
| `useSpaces` | useSyncStatus.ts | `['rag-spaces']` | 300 s | `UseQueryResult<SpaceInfo[]>` |
| `useCheckNew` | useSyncStatus.ts | `['rag-check-new', spaceId]` | 60 s | `UseQueryResult<CheckNewResponse>` |
| `useSpaceDocuments` | useSpaceDocuments.ts | `['rag-indexed-documents', spaceId]` | 120 s | `UseQueryResult<IndexedDocumentsResponse>` |

### Mutation Hooks

| Hook | File | Invalidates | Returns |
|---|---|---|---|
| `useRagSearch` | useRagSearch.ts | -- | `UseMutationResult<AskResponse>` |
| `useMetaEnrich` | useMetaStatus.ts | `['meta-pending']` | `UseMutationResult<{message} & MetaJob>` |
| `useUpdateSettings` | useSettings.ts | `['settings']`, `['meta-pending']` | `UseMutationResult<Settings>` |
| `useSync` | useSyncStatus.ts | `['rag-check-new']`, `['rag-indexed-documents']` | `UseMutationResult<SyncResponse>` |
| `useCreateSpace` | useSyncStatus.ts | `['rag-spaces']`, `['rag-check-new']`, `['rag-indexed-documents']` | `UseMutationResult<SpaceInfo[]>` |
| `useUpdateSpace` | useSyncStatus.ts | `['rag-spaces']`, `['rag-check-new']`, `['rag-indexed-documents']` | `UseMutationResult<SpaceInfo[]>` |
| `useDeleteSpace` | useSyncStatus.ts | `['rag-spaces']`, `['rag-check-new']`, `['rag-indexed-documents']` | `UseMutationResult<SpaceInfo[]>` |

### Utility Hooks

| Hook | File | Description | Returns |
|---|---|---|---|
| `useTick` | useTick.ts | Forces re-render at interval (default 60 s) for relative-time displays | `number` (tick counter) |
| `useServiceHealth` | useServiceHealth.ts | Derives per-service status from `useHealth` data | `{ health, isStarting, isDown, isHealthy, message }` |

---

## API Types

All types exported from `src/types/api.ts`.

| Type | Kind | Description |
|---|---|---|
| `ServiceStatus` | type alias | `'healthy' \| 'degraded' \| 'down'` -- health check status for a single service |
| `ServiceHealth` | interface | Per-service health: status, latencyMs, optional error string |
| `HealthResponse` | interface | Aggregated health: overall status + services map (paperless, rag, qdrant, lmStudio) + timestamp |
| `Citation` | interface | RAG search citation: doc_id, title, page, score, url, snippet |
| `AskResponse` | interface | RAG ask result: answer text, citations array, query, model_used |
| `CheckNewResponse` | interface | RAG check-new: new_count, new_documents list, totals, embedding/llm availability, models |
| `SyncResponse` | interface | RAG sync result: message, new_documents, indexed/skipped counts, total_chunks |
| `IndexedDocument` | interface | Single indexed doc: doc_id, title, file_type, ingested_at, chunk_count |
| `IndexedDocumentsResponse` | interface | Indexed docs list: space_id, documents array, total count |
| `PaperlessDocument` | interface | Paperless doc summary: id, title, created, modified, original_file_name, tags |
| `PaperlessDocumentList` | interface | Paginated doc list: count + results array |
| `OverviewStats` | interface | Dashboard stats: totalDocuments, inboxDocuments, addedThisMonth, fileTypes, topTags, topCorrespondents, documentTypes, missingMetadata |
| `TimelineRange` | type alias | `'30d' \| '6m' \| '12m'` -- timeline period selector |
| `TimelineBucket` | interface | Single timeline data point: date string + count |
| `TimelineResponse` | interface | Timeline data: range + buckets array |
| `MetaJob` | interface | Meta enrichment job: running flag, startedAt, output, error, exitCode |
| `Settings` | interface | App settings: paperlessUrl, paperlessToken, llmProvider, llmApiUrl, llmApiKey, qdrantUrl, metaNewTagId, metaNewTagName |
| `ConnectionTestResult` | interface | Connection test outcome: status, latencyMs, optional error |
| `RagProcessStatus` | type alias | `'running' \| 'starting' \| 'stopped'` -- RAG API process state |
| `RagProcessInfo` | interface | RAG process info: status + pathExists flag |
| `SpaceParams` | interface | RAG space config: chunk_tokens, chunk_overlap, top_k, score_threshold |
| `SpaceInfo` | interface | RAG space: slug, name, params |
| `SpaceCreateRequest` | interface | Create space body: slug, name, optional chunk/overlap/top_k/threshold |
| `SpaceUpdateRequest` | interface | Update space body: optional name, chunk_tokens, chunk_overlap, top_k, score_threshold |
| `LocalToolsInfo` | interface | Local tool paths: ragApi { path, exists }, meta { path, exists } |

**Total: 25 exported types**

---

## API Client

All methods on the `api` object exported from `src/api/client.ts`. Base URL is empty (Vite dev proxy forwards `/api` to `localhost:3001`).

| Method | HTTP | Path | Returns |
|---|---|---|---|
| `health` | GET | `/api/health` | `HealthResponse` |
| `ragAsk` | POST | `/api/rag/ask` | `AskResponse` |
| `ragCheckNew` | GET | `/api/rag/check-new` | `CheckNewResponse` |
| `ragSync` | POST | `/api/rag/sync` | `SyncResponse` |
| `ragIndexedDocuments` | GET | `/api/rag/indexed-documents` | `IndexedDocumentsResponse` |
| `ragSpaces` | GET | `/api/rag/spaces` | `SpaceInfo[]` |
| `ragCreateSpace` | POST | `/api/rag/spaces` | `SpaceInfo[]` |
| `ragUpdateSpace` | PUT | `/api/rag/spaces/:slug` | `SpaceInfo[]` |
| `ragDeleteSpace` | DELETE | `/api/rag/spaces/:slug` | `SpaceInfo[]` |
| `metaPending` | GET | `/api/meta/pending` | `PaperlessDocumentList` |
| `metaEnrich` | POST | `/api/meta/enrich` | `{ message } & MetaJob` |
| `metaStatus` | GET | `/api/meta/status` | `MetaJob` |
| `overview` | GET | `/api/overview` | `OverviewStats` |
| `timeline` | GET | `/api/overview/timeline?range=` | `TimelineResponse` |
| `getSettings` | GET | `/api/settings` | `Settings` |
| `updateSettings` | PUT | `/api/settings` | `Settings` |
| `testConnection` | POST | `/api/settings/test/:service` | `ConnectionTestResult` |
| `ragProcessStatus` | GET | `/api/settings/rag-process` | `RagProcessInfo` |
| `ragProcessAction` | POST | `/api/settings/rag-process/:action` | `{ status: string }` |
| `localToolsInfo` | GET | `/api/settings/local-tools` | `LocalToolsInfo` |

**Total: 20 API methods**
