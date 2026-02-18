"""FastAPI main application for Paperless RAG Q&A system."""

import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional
import asyncio

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from . import __version__
from .config import get_settings
from .models import (
    AskRequest, AskResponse, Citation, IngestRequest, IngestResponse,
    HealthResponse, DocumentInfo
)
from .paperless import test_connection as test_paperless_connection, list_documents, list_all_documents, get_document
from .retriever import search_similar_chunks, deduplicate_chunks
from .llm import generate_answer, test_llm_connection
from .ingest import ensure_collection, ingest_document, get_collection_stats
from .paperless import build_document_url

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(
            os.path.join(os.environ.get('LOG_DIR', '/app/logs'), 'app.log'),
            mode='a'
        )
    ]
)

logger = logging.getLogger(__name__)

# Global variables for shared resources
qdrant_client: Optional[QdrantClient] = None
embedding_model: Optional[SentenceTransformer] = None
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown.

    The embedding model is a hard requirement (local, no network).
    Everything else (Qdrant, Paperless, LLM) is best-effort — a warning
    is logged if unavailable but the server still starts so it can begin
    serving once the dependency comes back up.
    """
    logger.info("Starting Paperless RAG API...")

    global qdrant_client, embedding_model

    # ── Hard requirement: embedding model (local, no network) ──
    try:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    except Exception as e:
        logger.error(f"Failed to load embedding model — cannot start: {e}")
        raise

    # ── Best-effort: Qdrant ──
    try:
        logger.info(f"Connecting to Qdrant at {settings.QDRANT_URL}")
        qdrant_client = QdrantClient(url=settings.QDRANT_URL, timeout=5)
        embedding_dim = embedding_model.get_sentence_embedding_dimension()
        ensure_collection(qdrant_client, embedding_dim)
    except Exception as e:
        logger.warning(f"Qdrant unavailable at startup — will retry on first request: {e}")
        qdrant_client = None

    # ── Best-effort: Paperless ──
    try:
        await test_paperless_connection()
    except Exception as e:
        logger.warning(f"Paperless unavailable at startup: {e}")

    # ── Best-effort: LLM ──
    try:
        await test_llm_connection()
    except Exception as e:
        logger.warning(f"LLM unavailable at startup: {e}")

    logger.info("Startup complete")

    yield

    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Paperless RAG Q&A API",
    description="A RAG system for Q&A over documents stored in paperless-ngx",
    version=__version__,
    lifespan=lifespan
)

# Configure CORS - MUST be added immediately after app creation
# Ensure ALLOWED_ORIGINS is a list
cors_origins = settings.ALLOWED_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = [origin.strip() for origin in cors_origins.split(',')]

# For development, allow all origins if "*" is in the list
if "*" in cors_origins:
    cors_origins = ["*"]

# Add CORS middleware with explicit configuration
from starlette.middleware.cors import CORSMiddleware as StarletteCORS

# Use a permissive CORS policy suitable for LAN access. We avoid credentials so that
# we can safely allow any origin. The middleware will automatically handle preflight
# (OPTIONS) requests and echo the requesting Origin.
app.add_middleware(
    StarletteCORS,
    allow_origins=[],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"]
)


# Dependency to get Qdrant client
def get_qdrant_client() -> QdrantClient:
    """Get Qdrant client dependency. Retries connection if it failed at startup."""
    global qdrant_client
    if qdrant_client is None:
        # Lazy reconnect — Qdrant was unavailable at startup
        try:
            logger.info(f"Retrying Qdrant connection at {settings.QDRANT_URL}")
            qdrant_client = QdrantClient(url=settings.QDRANT_URL, timeout=5)
            embedding_dim = embedding_model.get_sentence_embedding_dimension()
            ensure_collection(qdrant_client, embedding_dim)
            logger.info("Qdrant reconnected successfully")
        except Exception as e:
            logger.warning(f"Qdrant still unavailable: {e}")
            qdrant_client = None
            raise HTTPException(
                status_code=503,
                detail=f"Qdrant unavailable — is it running at {settings.QDRANT_URL}?"
            )
    return qdrant_client


# Dependency to get embedding model
def get_embedding_model() -> SentenceTransformer:
    """Get embedding model dependency."""
    if embedding_model is None:
        raise HTTPException(status_code=500, detail="Embedding model not initialized")
    return embedding_model


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint. Does NOT depend on Qdrant being available."""
    components = {
        "qdrant": "unknown",
        "embedding_model": "unknown",
        "paperless": "unknown",
        "llm": "unknown"
    }

    # Test Qdrant (use global directly — don't go through dependency)
    try:
        client = get_qdrant_client()
        client.get_collections()
        components["qdrant"] = "healthy"
    except Exception as e:
        components["qdrant"] = f"error: {str(e)[:100]}"

    # Test embedding model
    try:
        if embedding_model:
            embedding_model.encode(["test"])
            components["embedding_model"] = "healthy"
        else:
            components["embedding_model"] = "error: not loaded"
    except Exception as e:
        components["embedding_model"] = f"error: {str(e)[:100]}"

    # Test paperless connection
    try:
        paperless_healthy = await test_paperless_connection()
        components["paperless"] = "healthy" if paperless_healthy else "error"
    except Exception as e:
        components["paperless"] = f"error: {str(e)[:100]}"

    # Test LLM connection
    try:
        llm_healthy = await test_llm_connection()
        components["llm"] = "healthy" if llm_healthy else "error"
    except Exception as e:
        components["llm"] = f"error: {str(e)[:100]}"

    # Determine overall status
    overall_status = "healthy" if all(
        status == "healthy" for status in components.values()
    ) else "degraded"

    return HealthResponse(
        status=overall_status,
        version=__version__,
        components=components
    )


@app.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    qdrant: QdrantClient = Depends(get_qdrant_client),
    embedder: SentenceTransformer = Depends(get_embedding_model)
):
    """Ask a question about the documents."""
    logger.info(f"Received question: {request.query[:100]}...")
    
    try:
        # Search for relevant chunks - increase top_k for better coverage
        top_k = request.top_k or settings.RAG_TOP_K
        # Double the search results to ensure we get comprehensive coverage
        search_k = top_k * 2 if top_k < 20 else top_k
        chunks = search_similar_chunks(
            qdrant_client=qdrant,
            embedding_model=embedder,
            query=request.query,
            top_k=search_k,
            filter_tags=request.filter_tags
        )
        
        # If no chunks found and general chat is allowed, fall back to non-RAG response
        if not chunks and request.allow_general_chat:
            logger.info("No RAG context found; falling back to general chat mode")
            llm_result = await generate_answer(request.query, [], history=request.history)
            return AskResponse(
                answer=llm_result["answer"],
                citations=[],
                query=request.query,
                model_used=llm_result["model"]
            )
        elif not chunks:
            logger.warning("No relevant chunks found for query")
            return AskResponse(
                answer="I couldn't find any relevant information in the documents to answer your question.",
                citations=[],
                query=request.query,
                model_used=settings.OPENROUTER_MODEL
            )
        
        # Deduplicate similar chunks
        chunks = deduplicate_chunks(chunks)
        
        # Generate answer using LLM
        llm_result = await generate_answer(request.query, chunks, history=request.history)
        
        # Build citations
        citations = []
        for chunk in chunks:
            citation = Citation(
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                page=chunk.get("page"),
                score=chunk["score"],
                url=build_document_url(chunk["doc_id"]),
                snippet=chunk["text"][:300] + "..." if len(chunk["text"]) > 300 else chunk["text"]
            )
            citations.append(citation)
        
        logger.info(f"Generated answer with {len(citations)} citations")
        
        return AskResponse(
            answer=llm_result["answer"],
            citations=citations,
            query=request.query,
            model_used=llm_result["model"]
        )
        
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    qdrant: QdrantClient = Depends(get_qdrant_client),
    embedder: SentenceTransformer = Depends(get_embedding_model)
):
    """Ingest documents into the vector database."""
    logger.info(f"Ingest request: doc_id={request.doc_id}, force_reindex={request.force_reindex}")
    
    try:
        if request.doc_id:
            # Ingest specific document
            result = await ingest_document(
                doc_id=request.doc_id,
                qdrant_client=qdrant,
                embedding_model=embedder,
                force_reindex=request.force_reindex
            )
            
            if result["status"] == "success":
                return IngestResponse(
                    message=f"Successfully ingested document {request.doc_id}",
                    documents_processed=1,
                    chunks_created=result["chunks_created"]
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to ingest document {request.doc_id}: {result.get('error', 'Unknown error')}"
                )
        else:
            # Ingest all or recently updated documents (background task)
            background_tasks.add_task(
                ingest_all_documents_background,
                qdrant,
                embedder,
                request.force_reindex,
                request.updated_after
            )
            
            return IngestResponse(
                message="Started background ingestion of documents",
                documents_processed=0,
                chunks_created=0
            )
            
    except Exception as e:
        logger.error(f"Error during ingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")


async def ingest_all_documents_background(
    qdrant: QdrantClient,
    embedder: SentenceTransformer,
    force_reindex: bool = False,
    updated_after: Optional[str] = None
):
    """Background task to ingest all documents."""
    logger.info("Starting background ingestion of all documents")
    
    try:
        # Get list of ALL documents from paperless (handles pagination)
        documents = await list_all_documents(updated_after=updated_after)
        
        total_docs = len(documents)
        processed = 0
        total_chunks = 0
        
        for doc in documents:
            doc_id = doc["id"]
            try:
                result = await ingest_document(
                    doc_id=doc_id,
                    qdrant_client=qdrant,
                    embedding_model=embedder,
                    force_reindex=force_reindex
                )
                
                if result["status"] == "success":
                    processed += 1
                    total_chunks += result["chunks_created"]
                    logger.info(f"Ingested document {doc_id} ({processed}/{total_docs})")
                else:
                    logger.warning(f"Skipped document {doc_id}: {result.get('reason', 'unknown')}")
                
            except Exception as e:
                logger.error(f"Failed to ingest document {doc_id}: {e}")
                continue
        
        logger.info(f"Background ingestion complete: {processed}/{total_docs} documents, {total_chunks} chunks")
        
    except Exception as e:
        logger.error(f"Background ingestion failed: {e}")


@app.get("/check-new")
async def check_new_documents(
    qdrant: QdrantClient = Depends(get_qdrant_client),
    embedder: SentenceTransformer = Depends(get_embedding_model)
):
    """Check for new documents WITHOUT indexing them. Also checks if LLM/embedding model is available."""
    logger.info("Checking for new documents (no indexing)")
    
    # First: Check if LLM and embedding model are available
    llm_available = False
    embedding_available = False
    
    try:
        llm_available = await test_llm_connection()
    except Exception as e:
        logger.warning(f"LLM not available: {e}")
    
    try:
        embedder.encode(["test"])
        embedding_available = True
    except Exception as e:
        logger.warning(f"Embedding model not available: {e}")
    
    if not embedding_available:
        raise HTTPException(
            status_code=503,
            detail="Embedding model not available. Cannot index documents without it."
        )
    
    try:
        # Get all documents from Paperless (use large page_size to get all)
        docs_response = await list_documents(page_size=10000)
        paperless_docs = docs_response.get("results", [])
        
        # Create lookup dict for doc details
        paperless_docs_dict = {doc["id"]: doc for doc in paperless_docs}
        paperless_doc_ids = set(paperless_docs_dict.keys())
        
        logger.info(f"Found {len(paperless_doc_ids)} documents in Paperless")
        
        # Get all indexed document IDs from Qdrant
        indexed_doc_ids = set()
        offset = None
        
        while True:
            result = qdrant.scroll(
                collection_name=settings.COLLECTION_NAME,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            
            points, next_offset = result
            
            for point in points:
                doc_id = point.payload.get("doc_id")
                if doc_id:
                    indexed_doc_ids.add(doc_id)
            
            if next_offset is None:
                break
            offset = next_offset
        
        logger.info(f"Found {len(indexed_doc_ids)} documents already indexed in RAG")
        
        # Find new documents
        new_doc_ids = paperless_doc_ids - indexed_doc_ids
        
        # Build detailed list with titles
        new_documents = []
        for doc_id in sorted(new_doc_ids):
            doc_info = paperless_docs_dict.get(doc_id, {})
            new_documents.append({
                "id": doc_id,
                "title": doc_info.get("title", "Unknown"),
                "created": doc_info.get("created"),
                "file_type": doc_info.get("file_type", "unknown")
            })
        
        return {
            "llm_available": llm_available,
            "embedding_available": embedding_available,
            "total_in_paperless": len(paperless_doc_ids),
            "total_indexed": len(indexed_doc_ids),
            "new_count": len(new_doc_ids),
            "new_documents": new_documents
        }
        
    except Exception as e:
        logger.error(f"Check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Check error: {str(e)}")


@app.post("/sync")
async def sync_new_documents(
    request: dict = None,
    qdrant: QdrantClient = Depends(get_qdrant_client),
    embedder: SentenceTransformer = Depends(get_embedding_model)
):
    """Index documents. Can index all new documents or only specific doc_ids.
    
    Request body (optional):
    {
        "doc_ids": [123, 456, 789]  // If provided, only index these IDs
    }
    
    If doc_ids is not provided, indexes ALL new documents.
    """
    logger.info("Starting sync")
    
    # Check if embedding model is available
    try:
        embedder.encode(["test"])
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Embedding model not available: {str(e)}"
        )
    
    try:
        # Get specific doc_ids from request if provided
        requested_doc_ids = None
        if request and "doc_ids" in request:
            requested_doc_ids = set(request["doc_ids"])
            logger.info(f"Syncing specific documents: {requested_doc_ids}")
        
        # Get all documents from Paperless (use large page_size to get all)
        docs_response = await list_documents(page_size=10000)
        paperless_docs = docs_response.get("results", [])
        paperless_doc_ids = {doc["id"] for doc in paperless_docs}
        
        logger.info(f"Found {len(paperless_doc_ids)} documents in Paperless")
        
        # Get all indexed document IDs from Qdrant
        indexed_doc_ids = set()
        offset = None
        
        while True:
            result = qdrant.scroll(
                collection_name=settings.COLLECTION_NAME,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            
            points, next_offset = result
            
            for point in points:
                doc_id = point.payload.get("doc_id")
                if doc_id:
                    indexed_doc_ids.add(doc_id)
            
            if next_offset is None:
                break
            offset = next_offset
        
        logger.info(f"Found {len(indexed_doc_ids)} documents already indexed in RAG")
        
        # Determine which documents to index
        if requested_doc_ids:
            # User specified specific docs - validate they exist and aren't indexed
            docs_to_index = requested_doc_ids & paperless_doc_ids  # Must exist in Paperless
            docs_to_index = docs_to_index - indexed_doc_ids  # Not already indexed
            
            invalid_ids = requested_doc_ids - paperless_doc_ids
            already_indexed = requested_doc_ids & indexed_doc_ids
            
            if invalid_ids:
                logger.warning(f"Requested doc_ids not in Paperless: {invalid_ids}")
            if already_indexed:
                logger.info(f"Requested doc_ids already indexed: {already_indexed}")
        else:
            # No specific docs requested - index ALL new documents
            docs_to_index = paperless_doc_ids - indexed_doc_ids
        
        if not docs_to_index:
            return {
                "message": "No documents to index",
                "new_documents": [],
                "indexed_count": 0,
                "skipped_count": len(indexed_doc_ids),
                "total_chunks": 0
            }
        
        logger.info(f"Indexing {len(docs_to_index)} documents")
        
        # Index documents
        indexed_docs = []
        failed_docs = []
        total_chunks = 0
        
        for doc_id in sorted(docs_to_index):
            try:
                result = await ingest_document(
                    doc_id=doc_id,
                    qdrant_client=qdrant,
                    embedding_model=embedder,
                    force_reindex=False
                )
                
                if result["status"] == "success":
                    indexed_docs.append(doc_id)
                    total_chunks += result["chunks_created"]
                    logger.info(f"✓ Indexed document {doc_id}")
                else:
                    failed_docs.append(doc_id)
                    logger.warning(f"✗ Skipped document {doc_id}: {result.get('reason')}")
                    
            except Exception as e:
                failed_docs.append(doc_id)
                logger.error(f"Failed to index document {doc_id}: {e}")
                continue
        
        return {
            "message": f"Sync complete: {len(indexed_docs)} documents indexed",
            "indexed_documents": indexed_docs,
            "failed_documents": failed_docs,
            "indexed_count": len(indexed_docs),
            "failed_count": len(failed_docs),
            "total_chunks": total_chunks
        }
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@app.get("/documents/search")
async def search_documents(
    q: str,
    limit: int = 10
):
    """Search for documents by title."""
    try:
        docs_response = await list_documents()
        documents = docs_response.get("results", [])
        
        # Simple title search
        query_lower = q.lower()
        matching_docs = []
        for doc in documents:
            if query_lower in doc.get("title", "").lower():
                matching_docs.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "url": build_document_url(doc["id"])
                })
        
        # Sort by relevance (exact match first)
        matching_docs.sort(key=lambda x: (
            not x["title"].lower().startswith(query_lower),
            x["title"].lower()
        ))
        
        return matching_docs[:limit]
        
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

@app.get("/documents", response_model=List[DocumentInfo])
async def list_paperless_documents(
    limit: int = 20,
    offset: int = 0
):
    """List documents from paperless-ngx."""
    try:
        docs_response = await list_documents()
        documents = docs_response.get("results", [])
        
        # Apply pagination
        paginated_docs = documents[offset:offset + limit]
        
        # Convert to our model
        doc_infos = []
        for doc in paginated_docs:
            doc_info = DocumentInfo(
                id=doc["id"],
                title=doc["title"],
                created=doc["created"],
                modified=doc["modified"],
                file_type=doc.get("file_type", "unknown"),
                page_count=doc.get("page_count"),
                tags=[tag["name"] for tag in doc.get("tags", [])]
            )
            doc_infos.append(doc_info)
        
        return doc_infos
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@app.get("/documents/{doc_id}", response_model=DocumentInfo)
async def get_document_info(doc_id: int):
    """Get information about a specific document."""
    try:
        doc = await get_document(doc_id)
        
        return DocumentInfo(
            id=doc["id"],
            title=doc["title"],
            created=doc["created"],
            modified=doc["modified"],
            file_type=doc.get("file_type", "unknown"),
            page_count=doc.get("page_count"),
            tags=[tag["name"] for tag in doc.get("tags", [])]
        )
        
    except Exception as e:
        logger.error(f"Error getting document {doc_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Document not found: {str(e)}")


@app.post("/reset-collection")
async def reset_collection(
    qdrant: QdrantClient = Depends(get_qdrant_client),
    embedder: SentenceTransformer = Depends(get_embedding_model)
):
    """Reset the RAG collection by deleting and recreating it. This will remove all indexed documents."""
    logger.warning("Resetting RAG collection - all indexed documents will be deleted")
    
    try:
        # Delete the collection
        try:
            qdrant.delete_collection(collection_name=settings.COLLECTION_NAME)
            logger.info(f"Deleted collection '{settings.COLLECTION_NAME}'")
        except Exception as e:
            logger.warning(f"Collection deletion warning (might not exist): {e}")
        
        # Recreate the collection
        embedding_dim = embedder.get_sentence_embedding_dimension()
        ensure_collection(qdrant, embedding_dim)
        logger.info(f"Recreated collection '{settings.COLLECTION_NAME}'")
        
        return {
            "message": "Collection reset successfully",
            "collection_name": settings.COLLECTION_NAME,
            "status": "ready"
        }
        
    except Exception as e:
        logger.error(f"Error resetting collection: {e}")
        raise HTTPException(status_code=500, detail=f"Error resetting collection: {str(e)}")


@app.get("/stats")
async def get_statistics(
    qdrant: QdrantClient = Depends(get_qdrant_client)
):
    """Get system statistics."""
    try:
        # Get collection stats
        collection_stats = get_collection_stats(qdrant)
        
        # Get paperless document count
        try:
            docs_response = await list_documents()
            paperless_doc_count = docs_response.get("count", 0)
        except Exception:
            paperless_doc_count = "unknown"
        
        return {
            "vector_database": collection_stats,
            "paperless_documents": paperless_doc_count,
            "embedding_model": settings.EMBEDDING_MODEL,
            "llm_model": settings.OPENROUTER_MODEL
        }
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with basic API information."""
    return {
        "name": "Paperless RAG Q&A API",
        "version": __version__,
        "description": "A RAG system for Q&A over documents stored in paperless-ngx",
        "endpoints": {
            "health": "/health",
            "ask": "/ask",
            "ingest": "/ingest",
            "documents": "/documents",
            "stats": "/stats"
        }
    }


# OPTIONS handler removed - handled by CORS middleware

@app.get("/cors-debug")
async def cors_debug():
    """Debug endpoint to check CORS configuration."""
    return {
        "allowed_origins": settings.ALLOWED_ORIGINS,
        "allowed_origins_type": type(settings.ALLOWED_ORIGINS).__name__
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=False
    )
