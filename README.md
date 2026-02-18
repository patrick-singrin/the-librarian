# The Librarian

A management dashboard for [Paperless-NGX](https://docs.paperless-ngx.com/) with RAG-powered search, metadata enrichment, and system health monitoring.

## Stack

- **Frontend**: Vite + React 19 + TypeScript, React Aria Components, Tailwind CSS v4
- **Backend**: Node.js Express API gateway
- **RAG API**: FastAPI + Qdrant + BAAI/bge-m3 embeddings
- **Meta Enrichment**: Python script for LLM-based document metadata enrichment

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Paperless-NGX instance
- Qdrant vector database
- LM Studio (or compatible OpenAI API endpoint)

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

## License

Private project.
