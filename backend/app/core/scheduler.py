"""
Background job scheduler (APScheduler).
Reserved for future maintenance tasks (e.g. purchasing reminders).
"""
from __future__ import annotations

from app.core.logging_config import root_logger

logger = root_logger

_scheduler = None


def start_scheduler():
    logger.info("APScheduler: no scheduled jobs configured")
    return None


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("APScheduler shut down")
