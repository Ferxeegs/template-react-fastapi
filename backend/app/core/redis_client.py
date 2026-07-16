"""
Redis client and utility helpers.
"""
from __future__ import annotations

import json
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.logging_config import root_logger

logger = root_logger

_redis_client: Redis | None = None


def get_redis_client() -> Redis | None:
    """Return a singleton Redis client when enabled."""
    global _redis_client

    if not settings.REDIS_ENABLED:
        return None

    if _redis_client is None:
        _redis_client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    return _redis_client


def close_redis_client() -> None:
    """Close singleton Redis client."""
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.close()
        except RedisError:
            logger.exception("Failed to close Redis client cleanly")
        finally:
            _redis_client = None


def safe_ping_redis() -> bool:
    """Health-check Redis. Returns False if unavailable."""
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except RedisError:
        logger.exception("Redis ping failed")
        return False


def get_cached_json(cache_key: str) -> Any | None:
    """Read JSON payload from Redis cache by key."""
    client = get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(cache_key)
        if raw is None:
            return None
        return json.loads(raw)
    except (RedisError, json.JSONDecodeError):
        logger.exception("Failed reading cache key '%s'", cache_key)
        return None


def set_cached_json(cache_key: str, payload: Any, ttl_seconds: int | None = None) -> None:
    """Write JSON payload to Redis cache."""
    client = get_redis_client()
    if client is None:
        return
    ttl = ttl_seconds if ttl_seconds is not None else settings.CACHE_DEFAULT_TTL_SECONDS
    try:
        client.setex(cache_key, ttl, json.dumps(payload))
    except (RedisError, TypeError):
        logger.exception("Failed writing cache key '%s'", cache_key)


def delete_cache_by_prefix(prefix: str) -> None:
    """Delete cache keys matching a prefix."""
    client = get_redis_client()
    if client is None:
        return
    try:
        keys = list(client.scan_iter(match=f"{prefix}*"))
        if keys:
            client.delete(*keys)
    except RedisError:
        logger.exception("Failed deleting cache keys with prefix '%s'", prefix)
