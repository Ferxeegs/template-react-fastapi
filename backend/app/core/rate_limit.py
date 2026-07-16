"""
Redis-backed rate limiting helpers.
"""
from __future__ import annotations

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.redis_client import get_redis_client
from app.core.logging_config import root_logger

logger = root_logger

RATE_LIMIT_LUA = """
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("TTL", KEYS[1])
local limit = tonumber(ARGV[1])
if current > limit then
  return {0, 0, ttl}
end
return {1, limit - current, ttl}
"""


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return (forwarded.split(",")[0] or "").strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    max_attempts: int,
    window_seconds: int,
    detail: str,
    key_suffix: str = "",
) -> None:
    """Redis sliding-window rate limit keyed by client IP (optional suffix per resource)."""
    client = get_redis_client()
    if client is None:
        return

    ip = _client_ip(request)
    key = f"rate_limit:{scope}:{ip}"
    if key_suffix:
        key = f"{key}:{key_suffix}"

    try:
        allowed, _remaining, ttl = client.eval(
            RATE_LIMIT_LUA,
            1,
            key,
            max_attempts,
            window_seconds,
        )
    except RedisError:
        logger.exception("Rate limit check failed for key '%s'", key)
        if settings.REDIS_FAIL_OPEN:
            return
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rate limiter unavailable",
        )

    if int(allowed) == 0:
        retry_after = max(int(ttl), 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)},
        )


def enforce_login_rate_limit(request: Request) -> None:
    """Enforce login rate limiting by client IP."""
    enforce_rate_limit(
        request,
        scope="login",
        max_attempts=settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS,
        window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
        detail="Terlalu banyak percobaan login. Silakan coba lagi nanti.",
    )
