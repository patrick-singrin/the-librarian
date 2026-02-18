"""Integration with paperless-ngx API."""

import logging
from typing import Dict, List, Optional, Any
import httpx
from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# HTTP headers for paperless API authentication
HEADERS = {"Authorization": f"Token {settings.PAPERLESS_API_TOKEN}"}


async def list_documents(
    updated_after: Optional[str] = None,
    page_size: int = 100,
    ordering: str = "-created"
) -> Dict[str, Any]:
    """
    List documents from paperless-ngx.
    
    Args:
        updated_after: ISO datetime string to filter documents modified after this time
        page_size: Number of documents per page
        ordering: Field to order by (e.g., "-created" for newest first)
    
    Returns:
        Dictionary containing documents list and pagination info
    """
    params = {
        "ordering": ordering,
        "page_size": page_size
    }
    
    if updated_after:
        params["modified__gt"] = updated_after
    
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/",
                params=params,
                headers=HEADERS
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to list documents: {e}")
            raise


async def list_all_documents(
    updated_after: Optional[str] = None,
    ordering: str = "-created"
) -> List[Dict[str, Any]]:
    """
    List ALL documents from paperless-ngx, handling pagination automatically.
    
    Args:
        updated_after: ISO datetime string to filter documents modified after this time
        ordering: Field to order by (e.g., "-created" for newest first)
    
    Returns:
        List of all document dictionaries
    """
    all_documents = []
    page = 1
    page_size = 100
    
    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            params = {
                "ordering": ordering,
                "page_size": page_size,
                "page": page
            }
            
            if updated_after:
                params["modified__gt"] = updated_after
            
            try:
                response = await client.get(
                    f"{settings.PAPERLESS_BASE_URL}/api/documents/",
                    params=params,
                    headers=HEADERS
                )
                response.raise_for_status()
                data = response.json()
                
                results = data.get("results", [])
                all_documents.extend(results)
                
                logger.info(f"Fetched page {page}: {len(results)} documents (total so far: {len(all_documents)})")
                
                # Check if there are more pages
                if not data.get("next"):
                    break
                
                page += 1
                
            except httpx.HTTPError as e:
                logger.error(f"Failed to list documents page {page}: {e}")
                raise
    
    logger.info(f"Fetched all {len(all_documents)} documents from Paperless")
    return all_documents


async def get_document(doc_id: int) -> Dict[str, Any]:
    """
    Get detailed information about a specific document.
    
    Args:
        doc_id: Paperless document ID
    
    Returns:
        Document metadata dictionary
    """
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/{doc_id}/",
                headers=HEADERS
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
            raise


async def download_document(doc_id: int) -> bytes:
    """
    Download the original document file.
    
    Args:
        doc_id: Paperless document ID
    
    Returns:
        Document file content as bytes
    """
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/{doc_id}/download/",
                headers=HEADERS
            )
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as e:
            logger.error(f"Failed to download document {doc_id}: {e}")
            raise


async def get_document_preview(doc_id: int) -> bytes:
    """
    Get document preview (usually PDF).
    
    Args:
        doc_id: Paperless document ID
    
    Returns:
        Preview file content as bytes
    """
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/{doc_id}/preview/",
                headers=HEADERS
            )
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as e:
            logger.error(f"Failed to get preview for document {doc_id}: {e}")
            raise


async def get_document_text(doc_id: int) -> str:
    """
    Get extracted text content from a document.
    
    Args:
        doc_id: Paperless document ID
    
    Returns:
        Extracted text content
    """
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/{doc_id}/download/",
                headers={**HEADERS, "Accept": "text/plain"}
            )
            if response.status_code == 200:
                return response.text
            else:
                # Fallback to downloading and extracting
                logger.warning(f"Text endpoint not available for document {doc_id}, using file download")
                return ""
        except httpx.HTTPError as e:
            logger.error(f"Failed to get text for document {doc_id}: {e}")
            return ""


def build_document_url(doc_id: int) -> str:
    """
    Build a URL to view the document in paperless-ngx UI.
    
    Args:
        doc_id: Paperless document ID
    
    Returns:
        URL string to view the document
    """
    return f"{settings.PAPERLESS_BASE_URL}/documents/{doc_id}"


async def test_connection() -> bool:
    """
    Test connection to paperless-ngx API.
    
    Returns:
        True if connection is successful, False otherwise
    """
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            # Try the documents endpoint instead of base API
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/",
                headers=HEADERS,
                params={"page_size": 1}
            )
            response.raise_for_status()
            logger.info("Successfully connected to paperless-ngx")
            return True
        except httpx.HTTPError as e:
            logger.error(f"Failed to connect to paperless-ngx: {e}")
            # Try alternative endpoint
            try:
                response = await client.get(
                    f"{settings.PAPERLESS_BASE_URL}/api/",
                    headers=HEADERS
                )
                if response.status_code == 200:
                    logger.info("Connected to paperless-ngx (via base API)")
                    return True
            except:
                pass
            return False


# --- Space helpers ---

# Cached custom field ID for the "RAG Spaces" field (resolved once)
_space_field_id: Optional[int] = None
_space_field_resolved: bool = False


async def get_space_field_id() -> Optional[int]:
    """Resolve the Paperless custom field ID for the RAG Spaces field.

    Calls GET /api/custom_fields/ once and caches the result.
    Returns None if the field doesn't exist.
    """
    global _space_field_id, _space_field_resolved

    if _space_field_resolved:
        return _space_field_id

    field_name = settings.SPACE_CUSTOM_FIELD_NAME
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/custom_fields/",
                headers=HEADERS,
                params={"page_size": 200},
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", data) if isinstance(data, dict) else data

            for field in results:
                if field.get("name") == field_name:
                    _space_field_id = field["id"]
                    _space_field_resolved = True
                    logger.info(f"Resolved '{field_name}' custom field → ID {_space_field_id}")
                    return _space_field_id

            logger.warning(f"Custom field '{field_name}' not found in Paperless")
            _space_field_resolved = True
            return None
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch custom fields: {e}")
            return None


def get_document_spaces(doc_metadata: dict) -> List[str]:
    """Extract space slugs from a document's custom_fields payload.

    Reads the value of the RAG Spaces custom field, splits on comma,
    strips/lowercases, and filters against defined spaces.
    Returns [] if the field is missing, empty, or no valid slugs found.
    """
    from .spaces_config import is_valid_space

    if _space_field_id is None:
        return []

    custom_fields = doc_metadata.get("custom_fields", [])
    for entry in custom_fields:
        if entry.get("field") == _space_field_id:
            raw_value = entry.get("value")
            if not raw_value or not isinstance(raw_value, str):
                return []

            slugs = [s.strip().lower() for s in raw_value.split(",") if s.strip()]
            valid = [s for s in slugs if is_valid_space(s)]

            invalid = set(slugs) - set(valid)
            if invalid:
                doc_id = doc_metadata.get("id", "?")
                logger.warning(f"Document {doc_id}: ignoring unknown space slugs: {invalid}")

            return valid

    return []


async def get_document_by_title(title: str) -> Optional[Dict[str, Any]]:
    """
    Search for a document by title.
    
    Args:
        title: Document title to search for
    
    Returns:
        Document metadata if found, None otherwise
    """
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.get(
                f"{settings.PAPERLESS_BASE_URL}/api/documents/",
                params={"title__icontains": title},
                headers=HEADERS
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("results"):
                return data["results"][0]
            return None
        except httpx.HTTPError as e:
            logger.error(f"Failed to search for document with title '{title}': {e}")
            return None
