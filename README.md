# The Librarian

An AI-powered companion for [Paperless-NGX](https://docs.paperless-ngx.com/) that automatically organizes your documents and makes them searchable through natural language.

> This is a personal hobby project, built for my own Paperless-NGX setup. It's not production-ready software and comes with no guarantees — but feel free to look around or draw inspiration.

## Vision

Like a professional librarian in a traditional library, The Librarian provides two essential services:

1. **Cataloging** (Paperless-Meta) — Organizing and enriching document metadata automatically when new documents arrive
2. **Reference** (Paperless-RAG) — Finding and understanding information across your entire collection through natural conversation

A human librarian doesn't just store books — they catalog new acquisitions with proper metadata, answer questions by knowing the collection deeply, make connections between related materials, and guide discovery through expertise and context. The Librarian brings these capabilities to digital document management through AI.

## Features

- **Overview Dashboard** — KPI tiles and a documents-over-time timeline chart for a quick pulse on your archive
- **RAG Tool** — Sync documents into a vector database, monitor indexing status, and search with citation-backed answers
- **Meta Data Tool** — Auto-enrich document metadata (title, tags, correspondent, document type) via LLM
- **Semantic Search** — Ask questions in natural language and get answers grounded in your documents with source citations
- **Settings** — Configure all service connections with built-in connection testing
- **Health Monitoring** — Live status for Paperless, Qdrant, LM Studio, and the RAG API

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
             │
        ┌────┴────┐
        ▼         ▼
     Qdrant    LM Studio
     (NAS)    (localhost)
```

- **Frontend**: Vite + React 19 + TypeScript, React Aria Components, Tailwind CSS v4
- **Backend**: Node.js Express as a thin API gateway
- **RAG API**: FastAPI with Qdrant vector DB and BAAI/bge-m3 embeddings
- **Meta Enrichment**: Python script that analyzes documents via LLM and writes metadata back to Paperless

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- A running Paperless-NGX instance
- Qdrant vector database
- LM Studio (or any OpenAI-compatible API endpoint)

### Configuration

1. Copy `backend/.env.example` to `backend/.env` and fill in your service URLs and tokens
2. Copy `tools/rag-api/env.example` to `tools/rag-api/.env`
3. Copy `tools/meta/config/settings.yaml.example` to `tools/meta/config/settings.yaml`

### Development

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend && npm install && npm run dev
```

## Status

Active development. This is a hobby project I work on in my spare time — expect rough edges.
