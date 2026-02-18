# The Librarian

A self-hosted AI companion for [Paperless-NGX](https://docs.paperless-ngx.com/) that enriches your documents with metadata and makes them searchable through natural language.

> **Hobby project** — built for my own Paperless-NGX setup on a Synology NAS. Not production-ready, no guarantees. Feel free to look around or draw inspiration.

## What It Does

**Cataloging** — When new documents land in Paperless, The Librarian analyzes them with a local LLM and writes back title, tags, correspondent, and document type automatically.

**Reference** — Documents are chunked, embedded, and stored in a vector database. Ask questions in plain language and get answers grounded in your documents, with source citations.

**Dashboard** — A web UI to monitor your archive, trigger enrichment, manage RAG sync, and configure everything.

## Screenshots

*Coming soon*

## Features

- **Overview** — KPI tiles and a documents-over-time timeline for a quick pulse on your archive
- **RAG Tool** — Sync documents into Qdrant, manage spaces, check indexing status
- **Meta Data Tool** — Trigger LLM-based metadata enrichment, configure the trigger tag
- **Semantic Search** — Natural language Q&A with citation-backed answers from your documents
- **Spaces** — Organize documents into separate RAG collections with independent settings
- **Settings** — Configure service connections with built-in health checks
- **Health Monitoring** — Live status bar for Paperless, Qdrant, LLM Provider, and the RAG API

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Vite + React 19 + TypeScript)    │
│  React Aria Components · Tailwind CSS v4    │
└──────────────────┬──────────────────────────┘
                   │ /api proxy
┌──────────────────▼──────────────────────────┐
│  Backend (Node.js Express, port 3001)       │
│  API gateway — no business logic            │
└───┬──────────┬──────────┬───────────────────┘
    │          │          │
    ▼          ▼          ▼
Paperless   RAG API    Meta Enrichment
 (NAS)     (FastAPI)   (Python script)
             │               │
        ┌────┴────┐          │
        ▼         ▼          │
     Qdrant    LM Studio ◄───┘
     (NAS)    (localhost)
```

| Component | Tech | Role |
|-----------|------|------|
| Frontend | Vite, React 19, TypeScript, Tailwind v4, React Aria | Web dashboard |
| Backend | Node.js, Express | API gateway, no business logic |
| RAG API | FastAPI, Python | Embedding, retrieval, Q&A with Qdrant |
| Meta Enrichment | Python | LLM-based document metadata extraction via LM Studio |
| Qdrant | Vector DB | Stores document embeddings |
| LM Studio | Local LLM server | Provides the language model (any OpenAI-compatible API works) |

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+ (with pip)
- **Paperless-NGX** instance with API access
- **Qdrant** vector database
- **LM Studio** or any OpenAI-compatible LLM endpoint
- An embedding model (default: `BAAI/bge-m3`)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-user/librarian.git
cd librarian

# Frontend
npm install

# Backend
cd backend && npm install && cd ..

# RAG API
cd tools/rag-api && pip install -r requirements.txt && cd ../..
```

### 2. Configure

Copy the example env files and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PAPERLESS_URL=http://your-nas:8777
PAPERLESS_TOKEN=your_paperless_api_token
QDRANT_URL=http://your-nas:6333
LM_STUDIO_URL=http://localhost:1234
```

### 3. Configure spaces (optional)

RAG spaces let you organize documents into separate collections. Edit `tools/rag-api/config/spaces.yaml`:

```yaml
defaults:
  chunk_tokens: 800
  chunk_overlap: 120
  top_k: 6
  score_threshold: 0.35

spaces:
  my-space:
    name: My Space
```

Assign documents to spaces via a Paperless custom field named **RAG Spaces** (type: String). Set the field value to a space slug.

### 4. Run

```bash
# Terminal 1 — Frontend (port 5173)
npm run dev

# Terminal 2 — Backend (port 3001)
cd backend && npm run dev

# Terminal 3 — RAG API (port 8088)
cd tools/rag-api && python -m uvicorn app.main:app --port 8088
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration

All service connections can be configured from the **Settings** page in the UI. The backend persists settings to `backend/.env`.

| Setting | Env Variable | Default |
|---------|-------------|---------|
| Paperless URL | `PAPERLESS_URL` | — |
| Paperless Token | `PAPERLESS_TOKEN` | — |
| LLM Provider URL | `LM_STUDIO_URL` | — |
| Qdrant URL | `QDRANT_URL` | — |
| Meta Tag ID | `META_NEW_TAG_ID` | `151` |
| Meta Tag Name | `META_NEW_TAG_NAME` | `NEW` |

The **Meta Tag** settings control which Paperless tag triggers enrichment. Create a tag in Paperless (e.g. "NEW"), note its ID, and enter both in the Meta Data Tool configuration tile.

## How RAG Works

1. **Check for New** scans Paperless for documents not yet in the vector DB
2. **Sync** chunks each document, generates embeddings via your embedding model, and stores them in Qdrant
3. **Search** takes your natural language query, finds relevant chunks via vector similarity, and sends them to the LLM as context for a grounded answer with citations

Documents are scoped to spaces — each space gets its own Qdrant collection. Only documents with a matching **RAG Spaces** custom field value are indexed.

## How Meta Enrichment Works

1. Tag a document in Paperless with your configured trigger tag (default: "NEW")
2. Click **Auto-Enrich All** in the Meta Data Tool
3. The enrichment script sends each document to the LLM for analysis
4. Extracted metadata (title, tags, correspondent, document type) is written back to Paperless
5. The trigger tag is removed after processing

## Tech Stack

- **React 19** with TypeScript and Vite
- **Tailwind CSS v4** with CSS-first configuration
- **React Aria Components** for accessible UI primitives
- **TanStack React Query** for server state management
- **Phosphor Icons** for iconography
- **Express** as a thin API gateway
- **FastAPI** for the RAG service
- **Qdrant** for vector storage
- **BAAI/bge-m3** for multilingual embeddings

## Status

Active development. This is a hobby project I work on in my spare time.

## License

This project is provided as-is for personal use and inspiration. No license is granted for commercial use.
