"""Load and manage per-space RAG configuration from spaces.yaml."""

import logging
import os
from dataclasses import dataclass
from typing import Dict, List, Optional

import yaml

from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Resolve config path relative to the rag-api root (one level up from app/)
_CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config")
_SPACES_CONFIG_PATH = os.path.join(_CONFIG_DIR, "spaces.yaml")

# Hardcoded fallback defaults matching current global settings
_FALLBACK_DEFAULTS = {
    "chunk_tokens": settings.CHUNK_TOKENS,
    "chunk_overlap": settings.CHUNK_OVERLAP,
    "top_k": settings.RAG_TOP_K,
    "score_threshold": 0.35,
}


@dataclass
class SpaceParams:
    """Per-space RAG tuning parameters."""
    chunk_tokens: int
    chunk_overlap: int
    top_k: int
    score_threshold: float


def load_spaces_config() -> dict:
    """Load spaces config from YAML file. Re-reads on every call (no caching)."""
    if not os.path.exists(_SPACES_CONFIG_PATH):
        logger.warning(f"Spaces config not found at {_SPACES_CONFIG_PATH}, using defaults")
        return {"defaults": _FALLBACK_DEFAULTS, "spaces": {}}

    try:
        with open(_SPACES_CONFIG_PATH, "r") as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Failed to read spaces config: {e}")
        return {"defaults": _FALLBACK_DEFAULTS, "spaces": {}}

    defaults = {**_FALLBACK_DEFAULTS, **(data.get("defaults") or {})}
    spaces = data.get("spaces") or {}
    return {"defaults": defaults, "spaces": spaces}


def save_spaces_config(spaces: dict, defaults: Optional[dict] = None) -> None:
    """Write the spaces config back to YAML, preserving the defaults section."""
    current = load_spaces_config()
    data = {
        "defaults": defaults if defaults is not None else current["defaults"],
        "spaces": spaces,
    }
    os.makedirs(os.path.dirname(_SPACES_CONFIG_PATH), exist_ok=True)
    with open(_SPACES_CONFIG_PATH, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    logger.info(f"Saved spaces config with {len(spaces)} space(s)")


def get_defined_spaces() -> List[str]:
    """Return list of all defined space slugs."""
    config = load_spaces_config()
    return list(config["spaces"].keys())


def is_valid_space(slug: str) -> bool:
    """Check if a slug is defined in the config."""
    return slug in load_spaces_config()["spaces"]


def get_space_params(space_id: Optional[str] = None) -> SpaceParams:
    """Get RAG parameters for a space, merging defaults with any overrides.

    If space_id is None or not defined, returns defaults.
    """
    config = load_spaces_config()
    defaults = config["defaults"]

    if space_id and space_id in config["spaces"]:
        overrides = config["spaces"][space_id]
        merged = {**defaults, **{k: v for k, v in overrides.items() if k != "name"}}
    else:
        merged = defaults

    return SpaceParams(
        chunk_tokens=int(merged["chunk_tokens"]),
        chunk_overlap=int(merged["chunk_overlap"]),
        top_k=int(merged["top_k"]),
        score_threshold=float(merged["score_threshold"]),
    )


def get_space_info(space_id: str) -> Optional[Dict]:
    """Return info dict for a single space, or None if not defined."""
    config = load_spaces_config()
    space_data = config["spaces"].get(space_id)
    if space_data is None:
        return None

    params = get_space_params(space_id)
    return {
        "slug": space_id,
        "name": space_data.get("name", space_id),
        "params": {
            "chunk_tokens": params.chunk_tokens,
            "chunk_overlap": params.chunk_overlap,
            "top_k": params.top_k,
            "score_threshold": params.score_threshold,
        },
    }


def get_all_spaces_info() -> List[Dict]:
    """Return info for all defined spaces."""
    config = load_spaces_config()
    result = []
    for slug in config["spaces"]:
        info = get_space_info(slug)
        if info:
            result.append(info)
    return result
