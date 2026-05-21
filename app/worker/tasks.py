from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy import delete, update

from app.db.session import AsyncSessionLocal
from app.models import OTPCode, UserSession, VirtualNumber
from app.models.enums import NumberStatus
from app.repositories.numbers import VirtualNumberRepository
from app.worker.celery_app import celery_app


def run(coro):
    return asyncio.run(coro)


@celery_app.task(name="app.worker.tasks.cleanup_expired_otp")
def cleanup_expired_otp() -> int:
    async def inner() -> int:
        async with AsyncSessionLocal() as session:
            result = await session.execute(delete(OTPCode).where(OTPCode.expires_at < datetime.now(UTC), OTPCode.is_used.is_(False)))
            await session.commit()
            return int(result.rowcount or 0)
    return run(inner())


@celery_app.task(name="app.worker.tasks.cleanup_expired_sessions")
def cleanup_expired_sessions() -> int:
    async def inner() -> int:
        async with AsyncSessionLocal() as session:
            result = await session.execute(delete(UserSession).where(UserSession.expires_at < datetime.now(UTC)))
            await session.commit()
            return int(result.rowcount or 0)
    return run(inner())


@celery_app.task(name="app.worker.tasks.release_expired_numbers")
def release_expired_numbers() -> int:
    async def inner() -> int:
        async with AsyncSessionLocal() as session:
            count = await VirtualNumberRepository(session).release_expired()
            await session.commit()
            return count
    return run(inner())
