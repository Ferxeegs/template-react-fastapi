"""
Cloudflare Turnstile server-side verification.

See: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def turnstile_is_configured() -> bool:
    return bool((settings.TURNSTILE_SECRET_KEY or "").strip())


def verify_turnstile_response(token: str | None, remote_ip: str | None) -> bool:
    """
    Validate a Turnstile token with Cloudflare. When no secret is configured,
    verification is skipped (local development).
    """
    if not turnstile_is_configured():
        return True

    if not token or not str(token).strip():
        return False

    payload: dict[str, Any] = {
        "secret": settings.TURNSTILE_SECRET_KEY.strip(),
        "response": str(token).strip(),
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(TURNSTILE_VERIFY_URL, data=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.warning("Turnstile siteverify request failed: %s", exc)
        return False

    if not isinstance(data, dict):
        return False

    if data.get("success") is True:
        return True

    codes = data.get("error-codes")
    logger.info("Turnstile verification failed: %s", codes)
    return False
