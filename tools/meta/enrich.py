#!/usr/bin/env python3
"""
Paperless Metadata Enrichment - Compact Version
================================================
AI-powered metadata enrichment with auto model selection
"""

import asyncio
import json
import yaml
import httpx
import logging
import sys
import re
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum

# Logging
logging.basicConfig(
    level=logging.INFO,  # INFO for normal operation, DEBUG for troubleshooting
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/enrichment.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Data Classes
class DecisionAction(Enum):
    APPROVE = "approve"
    EDIT = "edit"
    SKIP = "skip"
    QUIT = "quit"

@dataclass
class EnrichmentSuggestion:
    optimized_title: str
    tags: List[str]
    document_type: Optional[str]
    correspondent: Optional[str]
    new_tags: List[str] = field(default_factory=list)
    new_document_type: Optional[str] = None
    new_correspondent: Optional[str] = None
    confidence: float = 0.0
    reasoning: str = ""

@dataclass
class Document:
    id: int
    title: str
    content: str
    created: str
    tags: List[int]
    document_type: Optional[int]
    correspondent: Optional[int]
    original_file_name: str
    
    @property
    def file_extension(self) -> str:
        return Path(self.original_file_name).suffix


# Configuration
class Config:
    def __init__(self, config_dir: Path):
        self.config_dir = config_dir
        self.settings = self._load_yaml(config_dir / "settings.yaml")
        self.rules = self._load_yaml(config_dir / "rules.yaml")
        self.prompts = self._load_prompts(config_dir / "prompts")
        logger.info("Configuration loaded")
    
    def _load_yaml(self, path: Path) -> dict:
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    
    def _load_prompts(self, prompts_dir: Path) -> dict:
        prompts = {}
        for prompt_file in prompts_dir.glob("*.txt"):
            prompts[prompt_file.stem] = prompt_file.read_text()
        return prompts

# Metadata Cache
class MetadataCache:
    def __init__(self, data_dir: Path, paperless_url: str, api_token: str):
        self.data_dir = data_dir
        self.paperless_url = paperless_url
        clean_token = api_token.strip().strip('"').strip("'")
        self.headers = {"Authorization": f"Token {clean_token}"}
        
        self.tags: List[Dict] = []
        self.types: List[Dict] = []
        self.correspondents: List[Dict] = []
        self.tags_by_id: Dict[int, Dict] = {}
        self.tags_by_name: Dict[str, Dict] = {}
    
    async def load_from_paperless(self):
        logger.info("Loading metadata from Paperless...")
        async with httpx.AsyncClient(timeout=30) as client:
            # Tags
            r = await client.get(f"{self.paperless_url}/api/tags/?page_size=1000", headers=self.headers)
            r.raise_for_status()
            self.tags = r.json()["results"]
            
            # Types
            r = await client.get(f"{self.paperless_url}/api/document_types/?page_size=1000", headers=self.headers)
            r.raise_for_status()
            self.types = r.json()["results"]
            
            # Correspondents
            r = await client.get(f"{self.paperless_url}/api/correspondents/?page_size=1000", headers=self.headers)
            r.raise_for_status()
            self.correspondents = r.json()["results"]
        
        self._build_lookups()
        await self.save_to_cache()
        logger.info(f"Loaded {len(self.tags)} tags, {len(self.types)} types, {len(self.correspondents)} correspondents")
    
    async def load_from_cache(self):
        """Load metadata from cache with automatic refresh if stale"""
        cache_file = self.data_dir / "metadata_cache.json"
        
        if not cache_file.exists():
            logger.info("No cache file found, loading from Paperless...")
            await self.load_from_paperless()
            return
        
        # Check if cache is stale (older than 1 hour)
        if self._is_cache_stale(cache_file):
            logger.info("Cache is stale (>1 hour old), refreshing from Paperless...")
            await self.load_from_paperless()
            return
        
        # Load from cache
        with open(cache_file, 'r') as f:
            data = json.load(f)
            self.tags = data["tags"]
            self.types = data["types"]
            self.correspondents = data["correspondents"]
        self._build_lookups()
        
        cache_age = self._get_cache_age(cache_file)
        logger.info(f"Metadata loaded from cache (age: {cache_age})")
    
    def _is_cache_stale(self, cache_file: Path, max_age_hours: int = 1) -> bool:
        """Check if cache is older than max_age_hours"""
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
                updated = data.get("updated")
                
                if not updated:
                    # Old cache without timestamp
                    return True
                
                updated_dt = datetime.fromisoformat(updated)
                age = datetime.now() - updated_dt
                return age.total_seconds() > (max_age_hours * 3600)
        except (json.JSONDecodeError, KeyError, ValueError):
            # Corrupted cache
            return True
    
    def _get_cache_age(self, cache_file: Path) -> str:
        """Get human-readable cache age"""
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
                updated = data.get("updated")
                
                if not updated:
                    return "unknown"
                
                updated_dt = datetime.fromisoformat(updated)
                age = datetime.now() - updated_dt
                
                if age.total_seconds() < 60:
                    return f"{int(age.total_seconds())}s"
                elif age.total_seconds() < 3600:
                    return f"{int(age.total_seconds() / 60)}m"
                else:
                    return f"{age.total_seconds() / 3600:.1f}h"
        except:
            return "unknown"
    
    def _build_lookups(self):
        self.tags_by_id = {tag["id"]: tag for tag in self.tags}
        self.tags_by_name = {tag["name"].lower(): tag for tag in self.tags}
    
    async def save_to_cache(self):
        cache_file = self.data_dir / "metadata_cache.json"
        with open(cache_file, 'w') as f:
            json.dump({
                "tags": self.tags,
                "types": self.types,
                "correspondents": self.correspondents,
                "updated": datetime.now().isoformat()
            }, f, indent=2)
    
    def get_tag_ids(self, tag_names: List[str]) -> List[int]:
        ids = []
        for name in tag_names:
            tag = self.tags_by_name.get(name.lower())
            if tag:
                ids.append(tag["id"])
        return ids


# Rules Engine
class RulesEngine:
    def __init__(self, rules: dict):
        self.rules = rules
    
    def apply_auto_rules(self, document: Document) -> Dict:
        suggestions = {"tags": [], "document_type": None, "confidence_boost": 0.0}
        
        for rule in self.rules.get("auto_rules", []):
            trigger = rule.get("trigger")
            conditions = rule.get("conditions", [])
            actions = rule.get("actions", {})
            matched = False
            
            if trigger == "filename":
                for cond in conditions:
                    pattern = cond.get("pattern")
                    flags = re.IGNORECASE if cond.get("case_insensitive", True) else 0
                    if re.search(pattern, document.original_file_name, flags):
                        matched = True
                        break
            elif trigger == "content":
                for cond in conditions:
                    pattern = cond.get("pattern")
                    flags = re.IGNORECASE if cond.get("case_insensitive", True) else 0
                    if re.search(pattern, document.content[:2000], flags):
                        matched = True
                        break
            
            if matched:
                if "add_tags" in actions:
                    suggestions["tags"].extend(actions["add_tags"])
                if "set_type" in actions and not suggestions["document_type"]:
                    suggestions["document_type"] = actions["set_type"]
                if "confidence_boost" in actions:
                    suggestions["confidence_boost"] += actions["confidence_boost"]
        
        suggestions["tags"] = list(set(suggestions["tags"]))
        return suggestions


# LLM Service with Model Selection
class LLMService:
    def __init__(self, config: dict, prompts: dict, examples_dir: Path):
        self.base_url = config["base_url"]
        self.model = config.get("model")  # Optional - auto-detected
        self.temperature = config["temperature"]
        self.max_tokens = config["max_tokens"]
        self.timeout = config.get("timeout", 180)
        self.prompts = prompts
        self.examples_dir = examples_dir
    
    async def check_connection_and_select_model(self, interactive: bool = True) -> bool:
        """Check LM Studio and auto-select model"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/v1/models")
                response.raise_for_status()
                
                available_models = [m["id"] for m in response.json().get("data", [])]
                
                if not available_models:
                    print("\n❌ No models loaded in LM Studio!")
                    print("   Please load a model and try again.")
                    return False
                
                # Single model - use automatically
                if len(available_models) == 1:
                    self.model = available_models[0]
                    print(f"\n✅ Using model: {self.model}")
                    return True
                
                # Multiple models
                if interactive:
                    print(f"\n🔍 Found {len(available_models)} models:")
                    for idx, model_id in enumerate(available_models, 1):
                        marker = " (default)" if model_id == self.model else ""
                        print(f"   {idx}. {model_id}{marker}")
                    
                    if self.model in available_models:
                        print(f"\n✅ Using configured model: {self.model}")
                    else:
                        while True:
                            choice = input(f"\n👉 Select model [1-{len(available_models)}] or Enter for first: ").strip()
                            if not choice:
                                self.model = available_models[0]
                                break
                            try:
                                idx = int(choice) - 1
                                if 0 <= idx < len(available_models):
                                    self.model = available_models[idx]
                                    break
                            except ValueError:
                                pass
                            print(f"   ❌ Enter 1-{len(available_models)}")
                        print(f"   ✅ Selected: {self.model}")
                else:
                    # Non-interactive
                    self.model = self.model if self.model in available_models else available_models[0]
                
                return True
                
        except httpx.ConnectError:
            print(f"\n❌ Cannot connect to LM Studio at {self.base_url}")
            print("   Make sure LM Studio is running with server started")
            return False
        except Exception as e:
            print(f"\n❌ Error: {e}")
            return False
    
    async def analyze_document(self, document: Document, metadata: MetadataCache) -> EnrichmentSuggestion:
        prompt = self._build_prompt(document, metadata)
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens
                }
            )
            response.raise_for_status()
            result = response.json()["choices"][0]["message"]["content"]
        
        return self._parse_response(result)
    
    def _build_prompt(self, document: Document, metadata: MetadataCache) -> str:
        template = self.prompts.get("analyze_document", "")
        
        current_tags = [metadata.tags_by_id[tid]["name"] for tid in document.tags if tid in metadata.tags_by_id]
        
        return template.format(
            title=document.title,
            filename=document.original_file_name,
            file_extension=document.file_extension,
            created_date=document.created,
            current_tags=", ".join(current_tags) if current_tags else "None",
            current_type="None",
            current_correspondent="None",
            content=document.content[:2000],
            available_tags=", ".join([t["name"] for t in metadata.tags]),
            available_types=", ".join([t["name"] for t in metadata.types]),
            available_correspondents=", ".join([c["name"] for c in metadata.correspondents]),
            examples=self._load_examples()
        )
    
    def _load_examples(self) -> str:
        examples = ""
        for f in self.examples_dir.glob("*.json"):
            with open(f, 'r') as file:
                data = json.load(file)
                for ex in data.get("examples", [])[:1]:
                    examples += f"\n{json.dumps(ex, indent=2)}\n"
        return examples if examples else "No examples"
    
    def _parse_response(self, response: str) -> EnrichmentSuggestion:
        logger.debug(f"LLM response length: {len(response)} chars")
        
        # For reasoning models: Remove [THINK]...[/THINK] blocks first
        cleaned = re.sub(r'\[THINK\].*?\[/THINK\]', '', response, flags=re.DOTALL)
        cleaned = cleaned.strip()
        
        logger.debug(f"After removing [THINK] blocks: {len(cleaned)} chars")
        
        # Look for JSON object with proper nesting (handles nested objects)
        # Find the outermost {...} that contains "optimized_title"
        if '"optimized_title"' in cleaned:
            # Find all potential JSON blocks
            brace_count = 0
            start_idx = -1
            
            for i, char in enumerate(cleaned):
                if char == '{':
                    if brace_count == 0:
                        start_idx = i
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_idx != -1:
                        # Found a complete JSON block
                        json_str = cleaned[start_idx:i+1]
                        if '"optimized_title"' in json_str:
                            cleaned = json_str
                            logger.debug("Extracted JSON from response using brace matching")
                            break
        
        # Remove markdown code blocks if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response")
            logger.error(f"Full response length: {len(response)} chars")
            logger.error(f"First 300 chars: {response[:300]}")
            logger.error(f"Last 300 chars: {response[-300:]}")
            logger.error(f"Cleaned attempt (first 500): {cleaned[:500]}")
            raise ValueError(f"LLM returned invalid JSON. Model may need different prompt format.")
        # Handle new_correspondent - LLM sometimes returns dict instead of string
        new_correspondent = data.get("new_correspondent")
        if isinstance(new_correspondent, dict):
            # Extract just the name if it's a dict
            new_correspondent = new_correspondent.get("name") or new_correspondent.get("correspondent")
            logger.warning(f"LLM returned dict for new_correspondent, extracted: {new_correspondent}")
        
        # Handle reasoning - LLM sometimes returns dict instead of string
        reasoning = data.get("reasoning", "")
        if isinstance(reasoning, dict):
            # Convert dict to readable string
            reasoning_parts = []
            for key, value in reasoning.items():
                if isinstance(value, str):
                    reasoning_parts.append(f"{key}: {value}")
            reasoning = " | ".join(reasoning_parts)
            logger.warning(f"LLM returned dict for reasoning, converted to: {reasoning[:100]}...")
        
        return EnrichmentSuggestion(
            optimized_title=data.get("optimized_title", ""),
            tags=data.get("tags", []),
            document_type=data.get("document_type"),
            correspondent=data.get("correspondent"),
            new_tags=data.get("new_tags", []),
            new_document_type=data.get("new_document_type"),
            new_correspondent=new_correspondent,
            confidence=data.get("confidence", 0.0),
            reasoning=reasoning
        )


# Paperless Service
class PaperlessService:
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url
        clean_token = api_token.strip().strip('"').strip("'")
        self.headers = {"Authorization": f"Token {clean_token}"}
    
    async def get_documents_with_tag(self, tag_id: int) -> List[Document]:
        documents = []
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{self.base_url}/api/documents/?tags__id__in={tag_id}&page_size=100",
                headers=self.headers
            )
            results = r.json()["results"]
            
            for doc_data in results:
                r = await client.get(f"{self.base_url}/api/documents/{doc_data['id']}/", headers=self.headers)
                full_doc = r.json()
                documents.append(Document(
                    id=full_doc["id"],
                    title=full_doc["title"],
                    content=full_doc.get("content", ""),
                    created=full_doc["created"],
                    tags=full_doc.get("tags", []),
                    document_type=full_doc.get("document_type"),
                    correspondent=full_doc.get("correspondent"),
                    original_file_name=full_doc.get("original_file_name", "")
                ))
        return documents
    
    async def update_document(self, doc_id: int, **kwargs) -> bool:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.patch(
                f"{self.base_url}/api/documents/{doc_id}/",
                headers=self.headers,
                json=kwargs
            )
            r.raise_for_status()
            return True
    
    async def create_correspondent(self, name: str) -> int:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.base_url}/api/correspondents/",
                headers=self.headers,
                json={"name": name}
            )
            return r.json()["id"]
    
    async def create_document_type(self, name: str) -> int:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.base_url}/api/document_types/",
                headers=self.headers,
                json={"name": name}
            )
            return r.json()["id"]
    
    async def create_tag(self, name: str) -> int:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.base_url}/api/tags/",
                headers=self.headers,
                json={"name": name, "color": "#3B82F6"}
            )
            return r.json()["id"]


# Enrichment Service
class EnrichmentService:
    def __init__(self, config, metadata, llm, rules, paperless, settings):
        self.config = config
        self.metadata = metadata
        self.llm = llm
        self.rules = rules
        self.paperless = paperless
        self.settings = settings
    
    async def enrich_document(self, document: Document) -> EnrichmentSuggestion:
        logger.info(f"Enriching: {document.title} (ID: {document.id})")
        
        # Auto-rules
        auto = self.rules.apply_auto_rules(document)
        
        # LLM analysis
        llm_suggestion = await self.llm.analyze_document(document, self.metadata)
        
        # Merge
        all_tags = list(set(llm_suggestion.tags + auto.get("tags", [])))
        doc_type = auto.get("document_type") or llm_suggestion.document_type
        confidence = min(1.0, llm_suggestion.confidence + auto.get("confidence_boost", 0.0))
        
        return EnrichmentSuggestion(
            optimized_title=llm_suggestion.optimized_title,
            tags=all_tags[:10],  # Max 10 tags for comprehensive coverage
            document_type=doc_type,
            correspondent=llm_suggestion.correspondent,
            new_tags=llm_suggestion.new_tags,
            new_document_type=llm_suggestion.new_document_type,
            new_correspondent=llm_suggestion.new_correspondent,
            confidence=confidence,
            reasoning=llm_suggestion.reasoning
        )
    
    def _find_correspondent(self, name: str) -> Optional[int]:
        """Find correspondent ID with intelligent fuzzy matching"""
        logger.info(f"_find_correspondent called with: '{name}'")
        
        if not name:
            logger.info("_find_correspondent: name is empty, returning None")
            return None
        
        name_lower = name.lower()
        logger.info(f"_find_correspondent: searching for '{name_lower}'")
        logger.info(f"_find_correspondent: available correspondents: {[c['name'] for c in self.metadata.correspondents]}")
        
        # Try exact match first
        for c in self.metadata.correspondents:
            if c["name"].lower() == name_lower:
                logger.info(f"_find_correspondent: EXACT MATCH found - '{c['name']}' (ID: {c['id']})")
                return c["id"]
        
        logger.info("_find_correspondent: No exact match, trying bidirectional prefix matching...")
        
        # Try bidirectional prefix match
        # Case A: "Sheri (Author)" matches "Sheri (Author), UX Collective"
        # Case B: "Interaction Design Foundation (IDF)" matches "Interaction Design Foundation"
        for c in self.metadata.correspondents:
            existing_lower = c["name"].lower()
            
            # Suggested is prefix of existing
            if existing_lower.startswith(name_lower):
                logger.info(f"_find_correspondent: PREFIX MATCH (suggested is prefix) - '{name}' → '{c['name']}' (ID: {c['id']})")
                return c["id"]
            
            # Existing is prefix of suggested (NEW: handles abbreviations case)
            if name_lower.startswith(existing_lower):
                logger.info(f"_find_correspondent: PREFIX MATCH (existing is prefix) - '{name}' → '{c['name']}' (ID: {c['id']})")
                return c["id"]
        
        logger.info("_find_correspondent: No prefix match, trying core name matching...")
        
        # Try core name matching (ignore parenthetical suffixes)
        # e.g., "Interaction Design Foundation (IDF)" core = "interaction design foundation"
        # matches "Interaction Design Foundation" core = "interaction design foundation"
        import re
        name_core = re.sub(r'\s*\([^)]*\)\s*', '', name_lower).strip()
        logger.info(f"_find_correspondent: name_core = '{name_core}' (length: {len(name_core)})")
        
        if name_core and len(name_core) > 10:  # Only if meaningful core remains
            for c in self.metadata.correspondents:
                existing_core = re.sub(r'\s*\([^)]*\)\s*', '', c["name"].lower()).strip()
                logger.info(f"_find_correspondent: comparing '{name_core}' with '{existing_core}'")
                if name_core == existing_core:
                    logger.info(f"_find_correspondent: CORE NAME MATCH - '{name}' → '{c['name']}' (ID: {c['id']})")
                    return c["id"]
        
        logger.info("_find_correspondent: No core match, trying substring matching...")
        
        # Try contains match (for shorter queries)
        # Only if suggested name has significant length (>10 chars)
        if len(name) > 10:
            for c in self.metadata.correspondents:
                if name_lower in c["name"].lower():
                    logger.info(f"_find_correspondent: SUBSTRING MATCH - '{name}' → '{c['name']}' (ID: {c['id']})")
                    return c["id"]
        
        logger.info(f"_find_correspondent: NO MATCH FOUND for '{name}'")
        return None
    
    async def apply_enrichment(self, document: Document, suggestion: EnrichmentSuggestion) -> bool:
        try:
            # === EXTENSIVE DEBUG LOGGING ===
            logger.info("=== APPLY_ENRICHMENT DEBUG START ===")
            logger.info(f"Document ID: {document.id}")
            logger.info(f"suggestion.correspondent: {suggestion.correspondent!r}")
            logger.info(f"suggestion.new_correspondent: {suggestion.new_correspondent!r}")
            logger.info(f"suggestion.document_type: {suggestion.document_type!r}")
            logger.info(f"suggestion.new_document_type: {suggestion.new_document_type!r}")
            logger.info(f"suggestion.tags: {suggestion.tags}")
            logger.info(f"suggestion.new_tags: {suggestion.new_tags}")
            logger.info("=== APPLY_ENRICHMENT DEBUG END ===")
            
            # Handle correspondent with intelligent fuzzy matching
            correspondent_id = None
            if suggestion.new_correspondent:
                logger.info(f">>> ENTERING new_correspondent branch: '{suggestion.new_correspondent}'")
                # CRITICAL: Check if correspondent already exists before creating new one
                # This handles cases where LLM suggests "Org (Abbr)" but "Org" already exists
                existing_id = self._find_correspondent(suggestion.new_correspondent)
                logger.info(f">>> _find_correspondent returned: {existing_id}")
                if existing_id:
                    logger.info(f"✓ new_correspondent '{suggestion.new_correspondent}' matched existing ID {existing_id} via fuzzy matching")
                    correspondent_id = existing_id
                else:
                    logger.info(f"✗ No match found, creating new correspondent: '{suggestion.new_correspondent}'")
                    # Truly new correspondent - create it
                    correspondent_id = await self.paperless.create_correspondent(suggestion.new_correspondent)
                    self.metadata.correspondents.append({"id": correspondent_id, "name": suggestion.new_correspondent})
                    logger.info(f"Created new correspondent: {suggestion.new_correspondent} (ID: {correspondent_id})")
            elif suggestion.correspondent:
                logger.info(f">>> ENTERING correspondent branch: '{suggestion.correspondent}'")
                correspondent_id = self._find_correspondent(suggestion.correspondent)
                logger.info(f">>> _find_correspondent returned: {correspondent_id}")
            
            # Handle document type with fuzzy matching
            type_id = None
            if suggestion.new_document_type:
                # Check if type already exists (case-insensitive)
                doc_type = next((t for t in self.metadata.types if t["name"].lower() == suggestion.new_document_type.lower()), None)
                if doc_type:
                    logger.info(f"new_document_type '{suggestion.new_document_type}' matched existing type '{doc_type['name']}' (ID: {doc_type['id']})")
                    type_id = doc_type["id"]
                else:
                    # Truly new type - create it
                    type_id = await self.paperless.create_document_type(suggestion.new_document_type)
                    self.metadata.types.append({"id": type_id, "name": suggestion.new_document_type})
                    logger.info(f"Created new document type: {suggestion.new_document_type} (ID: {type_id})")
            elif suggestion.document_type:
                doc_type = next((t for t in self.metadata.types if t["name"].lower() == suggestion.document_type.lower()), None)
                if doc_type:
                    type_id = doc_type["id"]
            
            # Handle tags with duplicate checking
            tag_names = suggestion.tags.copy()
            for new_tag in suggestion.new_tags:
                # Check if tag already exists (case-insensitive)
                existing_tag = next((t for t in self.metadata.tags if t["name"].lower() == new_tag.lower()), None)
                if existing_tag:
                    logger.info(f"new_tag '{new_tag}' already exists as '{existing_tag['name']}' (ID: {existing_tag['id']}) - skipping creation")
                    tag_names.append(existing_tag["name"])  # Use existing name
                else:
                    # Truly new tag - create it
                    tag_id = await self.paperless.create_tag(new_tag)
                    self.metadata.tags.append({"id": tag_id, "name": new_tag})
                    self.metadata._build_lookups()
                    tag_names.append(new_tag)
                    logger.info(f"Created new tag: {new_tag} (ID: {tag_id})")
            
            # Get tag IDs
            tag_ids = self.metadata.get_tag_ids(tag_names)
            
            # Update document
            await self.paperless.update_document(
                document.id,
                title=suggestion.optimized_title,
                tags=tag_ids,
                document_type=type_id,
                correspondent=correspondent_id
            )
            
            # Remove NEW tag
            target_tag_id = self.settings["enrichment"]["target_tag_id"]
            if target_tag_id in tag_ids:
                tag_ids.remove(target_tag_id)
                await self.paperless.update_document(document.id, tags=tag_ids)
            
            logger.info(f"✅ Enriched document {document.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed: {e}")
            return False


# Interactive UI
class InteractiveUI:
    def show_suggestion(self, document: Document, suggestion: EnrichmentSuggestion, metadata: MetadataCache):
        current_tags = [metadata.tags_by_id[tid]["name"] for tid in document.tags if tid in metadata.tags_by_id]
        
        print(f"\n{'='*80}")
        print(f"📄 Document #{document.id}")
        print(f"{'='*80}")
        print(f"\n📋 CURRENT:")
        print(f"   Title: {document.title}")
        print(f"   File:  {document.original_file_name}")
        print(f"   Tags:  {', '.join(current_tags) if current_tags else 'None'}")
        
        print(f"\n✨ SUGGESTED (Confidence: {suggestion.confidence:.0%}):")
        print(f"   Title: {suggestion.optimized_title}")
        print(f"   Tags:  {', '.join(suggestion.tags)}")
        if suggestion.new_tags:
            print(f"          + New: {', '.join(suggestion.new_tags)}")
        print(f"   Type:  {suggestion.document_type or suggestion.new_document_type or 'None'}")
        if suggestion.new_document_type:
            print(f"          (new - will be created)")
        print(f"   Correspondent: {suggestion.correspondent or suggestion.new_correspondent or 'None'}")
        if suggestion.new_correspondent:
            print(f"                  (new - will be created)")
        
        print(f"\n💭 {suggestion.reasoning}")
        print(f"{'='*80}")
    
    def get_decision(self) -> DecisionAction:
        while True:
            response = input("\n👉 [a]pprove / [s]kip / [q]uit: ").lower().strip()
            if response in ['a', 'approve']:
                return DecisionAction.APPROVE
            elif response in ['s', 'skip']:
                return DecisionAction.SKIP
            elif response in ['q', 'quit']:
                return DecisionAction.QUIT
            print("❌ Invalid choice")
    
    def show_summary(self, total, processed, approved, skipped, errors):
        print(f"\n{'='*80}")
        print(f"📊 SUMMARY")
        print(f"{'='*80}")
        print(f"Total: {total} | Processed: {processed} | Approved: {approved} | Skipped: {skipped} | Errors: {errors}")
        print(f"{'='*80}\n")


# Main
async def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI-powered Paperless metadata enrichment")
    parser.add_argument("--sync", action="store_true", help="Sync metadata from Paperless first")
    parser.add_argument("--dry-run", action="store_true", help="Don't apply changes")
    parser.add_argument("--auto-approve", action="store_true", help="Auto-approve high confidence")
    parser.add_argument("--batch-size", type=int, default=10, help="Max documents to process (0 = unlimited, default: 10)")
    parser.add_argument("--non-interactive", action="store_true", help="Non-interactive mode")
    args = parser.parse_args()
    
    if args.non_interactive and not args.auto_approve:
        print("❌ --non-interactive requires --auto-approve")
        sys.exit(1)
    
    print("\n╔═══════════════════════════════════════════════════════════════╗")
    print("║          📚 PAPERLESS METADATA ENRICHMENT                     ║")
    print("╚═══════════════════════════════════════════════════════════════╝\n")
    
    # Load config
    base_dir = Path(__file__).parent
    config = Config(base_dir / "config")
    settings = config.settings
    
    # Initialize services
    logger.info("Initializing...")
    
    metadata = MetadataCache(
        base_dir / "data",
        settings["paperless"]["base_url"],
        settings["paperless"]["api_token"]
    )
    
    if args.sync:
        print("🔄 Syncing metadata...")
        await metadata.load_from_paperless()
    else:
        await metadata.load_from_cache()
    
    paperless = PaperlessService(
        settings["paperless"]["base_url"],
        settings["paperless"]["api_token"]
    )
    
    llm = LLMService(
        settings["lm_studio"],
        config.prompts,
        base_dir / "examples"
    )
    
    # Check LM Studio and select model
    print("\n🔌 Checking LM Studio connection...")
    if not await llm.check_connection_and_select_model(not args.non_interactive):
        sys.exit(1)
    
    rules = RulesEngine(config.rules)
    service = EnrichmentService(config, metadata, llm, rules, paperless, settings)
    ui = InteractiveUI()
    
    # Find documents
    target_tag_id = settings["enrichment"]["target_tag_id"]
    print(f"\n🔍 Finding documents with tag ID {target_tag_id}...")
    documents = await paperless.get_documents_with_tag(target_tag_id)
    
    if not documents:
        print("✅ No documents with 'NEW' tag!")
        return
    
    print(f"   Found {len(documents)} documents")
    
    # Apply batch size limit (0 = unlimited)
    if args.batch_size > 0:
        documents = documents[:args.batch_size]
        print(f"   Processing first {len(documents)} documents (batch-size={args.batch_size})")
    else:
        print(f"   Processing all {len(documents)} documents (batch-size=0, unlimited)")
    
    # Process
    processed = approved = skipped = errors = 0
    
    for idx, doc in enumerate(documents, 1):
        try:
            print(f"\n{'─'*80}")
            print(f"Processing {idx}/{len(documents)}")
            print(f"{'─'*80}")
            
            suggestion = await service.enrich_document(doc)
            
            if not args.non_interactive:
                ui.show_suggestion(doc, suggestion, metadata)
            
            # Decide
            decision = None
            if args.auto_approve and suggestion.confidence >= settings["enrichment"]["auto_approve_threshold"]:
                decision = DecisionAction.APPROVE
                print(f"\n✨ Auto-approved ({suggestion.confidence:.0%})")
            elif args.non_interactive:
                print(f"\n⏭️  Skipped ({suggestion.confidence:.0%} below threshold)")
                decision = DecisionAction.SKIP
            else:
                decision = ui.get_decision()
            
            # Apply
            if decision == DecisionAction.APPROVE:
                if not args.dry_run:
                    success = await service.apply_enrichment(doc, suggestion)
                    if success:
                        approved += 1
                        print("✅ Applied!")
                    else:
                        errors += 1
                else:
                    approved += 1
                    print("✅ Would apply (dry-run)")
            elif decision == DecisionAction.SKIP:
                skipped += 1
                print("⏭️  Skipped")
            elif decision == DecisionAction.QUIT:
                print("\n👋 Quitting...")
                break
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Error: {e}")
            errors += 1
            print(f"❌ Error: {e}")
    
    ui.show_summary(len(documents), processed, approved, skipped, errors)
    await metadata.save_to_cache()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal: {e}")
        print(f"\n❌ Fatal: {e}")
        sys.exit(1)
