# The Librarian — Application Inventory

> Full inventory of features, pages, components, settings, data entities, and integrations.
> Use this to review information architecture and identify optimization opportunities.

---

## 1. Navigation & Page Structure

| Route | Page | Nav Label | Icon | Status |
|-------|------|-----------|------|--------|
| `/` | HealthDashboard | Overview | House | Active |
| `/meta` | MetaPage | Meta Data Tool | Tag | Active |
| `/sync` | SyncPage | RAG Tool | CircuitBoard | Active |
| `/settings` | SettingsPage | Settings | Sliders | Active |
| `/dev/components` | ComponentsDemo | — | — | Dev only |
| — | SearchPage | — | — | Built but not routed |
| — | API Monitoring | — | Code | Disabled in nav |

**Shell**: Sticky StatusBar (top) + collapsible Sidebar (left) + main content area.

---

## 2. Feature Inventory per Page

### 2.1 Overview (`/`)

| Feature | Component | Data Source | Polling |
|---------|-----------|-------------|---------|
| Documents KPI | KpiTile | `useOverview()` | 60s |
| Inbox KPI | KpiTile | `useOverview()` | 60s |
| Synced % KPI | KpiTile | `useCheckNew()` | 60s |
| Document Timeline chart | DocumentTimeline | `useTimeline(range)` | 120s |
| Timeline range switcher | Button group (30D / 6M / 12M) | local state | — |

**Notes**:
- 3 KPIs + 1 chart. No drill-down from KPIs to detail pages.
- Backend provides tag/correspondent/type/metadata-gap data that is not displayed.

### 2.2 Meta Data Tool (`/meta`)

| Feature | Component | Data Source | Polling |
|---------|-----------|-------------|---------|
| Pending count (hero) | Tile | `useMetaPending()` | 60s |
| Refresh button | Button | refetches meta-pending | — |
| Auto-Enrich All button | Button | `useMetaEnrich()` | — |
| Job status output | Tile (pre-formatted) | `useMetaJobStatus()` | 3s (when active) |
| Pending documents list | Card list | `useMetaPending()` | 60s |
| Tag Name config | TextField | `useSettings()` / `useUpdateSettings()` | 300s |
| Tag ID config | TextField (number) | `useSettings()` / `useUpdateSettings()` | 300s |
| Save config button | Button | PUT `/api/settings` | — |

**Notes**:
- Linear workflow: see pending > enrich > watch output.
- Config section rarely changed, feels disconnected from main flow.
- No enrichment history. No per-document enrichment trigger.

### 2.3 RAG Tool (`/sync`)

| Feature | Component | Data Source | Polling |
|---------|-----------|-------------|---------|
| Space selector dropdown | Select | `useSpaces()` | 300s |
| Sync status hero (indexed/total) | Tile | `useCheckNew(spaceId)` | 60s |
| Progress bar | custom | derived from indexed/total | — |
| Embedding model indicator | Badge | CheckNewResponse | — |
| LLM model indicator | Badge | CheckNewResponse | — |
| Model info expandable | IconButton + collapse | local state | — |
| Unassigned docs hint | info box | CheckNewResponse | — |
| Check for New button | Button | refetches check-new | — |
| Sync All button | Button | `useSync()` | — |
| Unindexed docs list (max 10) | Card list + per-doc Sync | `useCheckNew()` | — |
| Indexed docs list (space view) | Tile + scrollable list | `useSpaceDocuments(spaceId)` | 120s |
| Spaces list | SpacesTile | `useSpaces()` | 300s |
| Create space form (inline) | TextField + advanced toggle | `useCreateSpace()` | — |
| Edit space form (inline) | TextField | `useUpdateSpace()` | — |
| Delete space (confirm) | Button pair | `useDeleteSpace()` | — |
| Space advanced params | 4 fields | local state | — |

**Notes**:
- Most complex page: monitoring + actions + CRUD for spaces.
- "All Spaces" vs single-space changes which sections are visible.
- Search page exists but is disconnected from this tool.

### 2.4 Settings (`/settings`)

| Feature | Component | Data Source | Polling |
|---------|-----------|-------------|---------|
| Paperless URL | TextField | `useSettings()` | 300s |
| Paperless Token | TextField (password) | `useSettings()` | 300s |
| Test Paperless | Button | POST `/api/settings/test/paperless` | — |
| LLM Provider | Select (LM Studio only) | `useSettings()` | 300s |
| LLM API URL | TextField | `useSettings()` | 300s |
| LLM API Key | TextField (password) | `useSettings()` | 300s |
| Test LLM | Button | POST `/api/settings/test/llm` | — |
| Qdrant URL | TextField | `useSettings()` | 300s |
| Test Qdrant | Button | POST `/api/settings/test/qdrant` | — |
| RAG Engine status | Indicator + text | `useRagProcess()` | polled |
| RAG Engine path | status text | `/api/settings/local-tools` | — |
| RAG deps (Qdrant + LLM) | Indicator pair | derived from health | — |
| Start/Stop/Restart RAG | Button group | POST `/api/settings/rag-process/:action` | — |
| Test RAG | Button | POST `/api/settings/test/rag` | — |
| Meta path check | status text | `/api/settings/local-tools` | — |
| Save (per service) | Button per ServiceCard | PUT `/api/settings` | — |

**Notes**:
- 4 service cards: Paperless, LLM, Qdrant, Local Tools.
- Each card has its own save (not a global save).
- RAG process management here, not on RAG Tool page.
- Meta tag config on Meta page, not here.

### 2.5 Search (not routed)

| Feature | Component | Data Source |
|---------|-----------|-------------|
| Search input | TextField | local state |
| Space selector | Select | `useSpaces()` |
| Submit search | Button | `useRagSearch()` |
| Result answer | ResultCard | AskResponse |
| Citations list | ResultCard (sub) | AskResponse.citations |

---

## 3. Persistent Shell Components

| Component | Location | Purpose | Data |
|-----------|----------|---------|------|
| StatusBar | Top (sticky) | 4 service health badges with latency tooltips | `useHealth()` — 30s |
| Sidebar | Left (collapsible) | 4 nav items + collapse toggle | static routes |

---

## 4. Backend API Endpoints (22 total)

### Health (1)
- `GET /api/health` — All-service health check

### Overview (2)
- `GET /api/overview` — Dashboard stats (docs, inbox, tags, correspondents, types, missing metadata)
- `GET /api/overview/timeline` — Document creation buckets (30d / 6m / 12m)

### RAG (9)
- `POST /api/rag/ask` — Semantic search query
- `GET /api/rag/stats` — Index statistics
- `GET /api/rag/check-new` — Unindexed document count
- `POST /api/rag/sync` — Index documents
- `GET /api/rag/indexed-documents` — List indexed docs for space
- `GET /api/rag/spaces` — List spaces
- `POST /api/rag/spaces` — Create space
- `PUT /api/rag/spaces/:slug` — Update space
- `DELETE /api/rag/spaces/:slug` — Delete space

### Meta (3)
- `GET /api/meta/pending` — Docs tagged NEW
- `POST /api/meta/enrich` — Start enrichment job
- `GET /api/meta/status` — Job progress/output

### Settings (5)
- `GET /api/settings` — Current config values
- `PUT /api/settings` — Update config
- `POST /api/settings/test/:service` — Test connection
- `GET /api/settings/rag-process` — RAG process status
- `POST /api/settings/rag-process/:action` — Start/stop/restart RAG

### Local Tools (1)
- `GET /api/settings/local-tools` — Check tool directory paths

---

## 5. External Services (4)

| Service | Purpose | Connection |
|---------|---------|------------|
| Paperless-NGX | Document management, metadata, tags | Token auth, NAS:8777 |
| RAG API | Semantic search, embeddings, indexing | Child process, :8088 |
| Qdrant | Vector database for RAG | NAS:6333 |
| LM Studio | Local LLM inference | :1234 |

---

## 6. Data Entities

| Entity | Source | Used In |
|--------|--------|---------|
| Document | Paperless | Overview KPIs, Meta pending, Sync unindexed |
| Tag | Paperless | Meta enrichment trigger (NEW tag) |
| Correspondent | Paperless | Backend fetches, **not displayed in frontend** |
| Document Type | Paperless | Backend fetches, **not displayed in frontend** |
| Indexed Document | RAG/Qdrant | Sync indexed list (per space) |
| RAG Space | RAG API | Sync space management, search scope |
| Space Params | RAG API | Advanced chunk/search config per space |
| Citation | RAG API | Search results |
| Meta Job | Backend in-memory | Enrichment progress/output |
| Settings | Backend .env | Service configuration |
| Service Health | Backend (live) | StatusBar, page alerts |

---

## 7. UI Component Library (16 components)

| Component | Type | Variants |
|-----------|------|----------|
| Button | Action | 9 (3 roles x 3 styles) x 3 sizes |
| IconButton | Action | Ghost only, icon-only or with text |
| Card | Container | 2 padding sizes |
| Tile | Container | Icon, title, badge, timestamp |
| KpiTile | Dashboard | Number display + loading |
| SpaceTile | Dashboard | Progress bar + fraction |
| Badge | Status | 6 variants x 2 types x 2 sizes |
| Indicator | Status | 4 variants x 2 sizes |
| Icon | Display | 5 sizes (Phosphor) |
| Tooltip | Overlay | 4 placements |
| Label | Form | Required/optional, helper, infoTip |
| InputItem | Form | Prefix/suffix, error state |
| TextField | Form | Composed Label+Input+error |
| Select | Form | Dropdown with popover |
| NavItem | Navigation | Active, collapsed, disabled |
| Separator | Layout | Horizontal divider |

---

## 8. Custom Hooks (18)

| Hook | Query Key | Poll | Used By |
|------|-----------|------|---------|
| useHealth | `['health']` | 30s | StatusBar |
| useServiceHealth | wraps useHealth | — | Pages |
| useOverview | `['overview']` | 60s | HealthDashboard |
| useTimeline | `['timeline', range]` | 120s | DocumentTimeline |
| useTick | — (interval) | configurable | Relative time refresh |
| useCheckNew | `['rag-check-new', spaceId]` | 60s | HealthDashboard, SyncPage |
| useSync | mutation | — | SyncPage |
| useSpaces | `['rag-spaces']` | 300s | SyncPage, SearchPage |
| useCreateSpace | mutation | — | SpacesTile |
| useUpdateSpace | mutation | — | SpacesTile |
| useDeleteSpace | mutation | — | SpacesTile |
| useSpaceDocuments | `['rag-indexed-documents', id]` | 120s | SyncPage |
| useRagSearch | mutation | — | SearchPage |
| useMetaPending | `['meta-pending']` | 60s | MetaPage |
| useMetaEnrich | mutation | — | MetaPage |
| useMetaJobStatus | `['meta-status']` | 3s (cond.) | MetaPage |
| useSettings | `['settings']` | 300s | SettingsPage, MetaPage |
| useUpdateSettings | mutation | — | SettingsPage, MetaPage |

---

## 9. Settings & Configuration

| Setting | Storage | UI Control | Page |
|---------|---------|------------|------|
| Paperless URL | .env | TextField | Settings |
| Paperless Token | .env | TextField (password) | Settings |
| LLM Provider | .env | Select | Settings |
| LLM API URL | .env | TextField | Settings |
| LLM API Key | .env | TextField (password) | Settings |
| Qdrant URL | .env | TextField | Settings |
| Meta NEW Tag Name | .env | TextField | **Meta page** |
| Meta NEW Tag ID | .env | TextField (number) | **Meta page** |
| RAG Space slug | RAG API | TextField | Sync page |
| RAG Space name | RAG API | TextField | Sync page |
| Space chunk_tokens | RAG API | TextField (advanced) | Sync page |
| Space chunk_overlap | RAG API | TextField (advanced) | Sync page |
| Space top_k | RAG API | TextField (advanced) | Sync page |
| Space score_threshold | RAG API | TextField (advanced) | Sync page |
| Timeline range | local state | Button group | Overview |
| Space selector | local state | Select | Sync page |
| Sidebar collapsed | local state | Toggle | Shell |

---

## 10. Information Architecture Observations

### Backend data not surfaced in frontend

The `/api/overview` endpoint returns data that is fetched but never displayed:

- `addedThisMonth` — documents added this calendar month
- `totalTags` / `topTags[]` — tag distribution with colors
- `totalCorrespondents` / `topCorrespondents[]` — sender/source distribution
- `totalDocumentTypes` / `documentTypes[]` — type breakdown
- `characterCount` — total text volume
- `fileTypes[]` — MIME type distribution
- `missingMetadata.untagged` — documents without tags
- `missingMetadata.noCorrespondent` — documents without a sender
- `missingMetadata.noDocumentType` — documents without a type

### Disconnected features

- **Search page** is fully built but not wired to the router
- **API Monitoring** is listed in nav but disabled (no implementation)
- **Meta tag config** lives on Meta page; all other service config on Settings (split)
- **RAG process management** is in Settings; RAG indexing in Sync page (split)

### Potential IA improvements

1. **Overview is data-light**: 3 KPIs + 1 chart, but backend has tag/correspondent/type/gap data ready
2. **No document-level view**: Can't browse or inspect individual documents
3. **Search is hidden**: RAG search exists but isn't accessible to users
4. **Tool pages mix concerns**: SyncPage combines monitoring + indexing controls + space CRUD
5. **Configuration is scattered**: Meta tag config on Meta page, service URLs on Settings, space params on Sync
6. **No activity/history**: No log of past enrichment runs, sync operations, or queries
7. **Metadata gaps invisible**: Backend knows about untagged/uncategorized docs but frontend doesn't show it
