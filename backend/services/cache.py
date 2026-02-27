import hashlib
import json
import logging
from typing import Optional, Any
from diskcache import Cache
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Initialize a file-based cache in the .cache directory
cache_dir = ".cache"
# 24 hour expiration by default
CACHE_EXPIRATION_SECONDS = 86400

try:
    analysis_cache = Cache(cache_dir)
    logger.info(f"Initialized diskcache at {cache_dir}")
except Exception as e:
    logger.error(f"Failed to initialize diskcache: {e}")
    analysis_cache = None

def generate_hash(content: str, raw_bytes: Optional[bytes] = None) -> str:
    """Generate a stable SHA-256 hash of the input content and optional bytes."""
    hasher = hashlib.sha256()
    hasher.update(content.encode('utf-8'))
    if raw_bytes:
        hasher.update(raw_bytes)
    return hasher.hexdigest()

def get_cached_report(content_hash: str) -> Optional[dict]:
    """Retrieve a cached ThreatReport by its content hash."""
    if analysis_cache is None:
        return None
    try:
        cached_data = analysis_cache.get(content_hash)
        if cached_data:
            logger.info(f"Cache hit for hash {content_hash}")
            return cached_data
        return None
    except Exception as e:
        logger.error(f"Error reading from cache: {e}")
        return None

def set_cached_report(content_hash: str, report_data: dict) -> None:
    """Save a serialized ThreatReport to the cache."""
    if analysis_cache is None:
        return
    try:
        # Save as a dict
        analysis_cache.set(content_hash, report_data, expire=CACHE_EXPIRATION_SECONDS)
        logger.info(f"Saved analysis to cache for hash {content_hash}")
    except Exception as e:
        logger.error(f"Error writing to cache: {e}")
