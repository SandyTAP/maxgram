from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import NumberStatus, VirtualNumber
from app.repositories.base import Repository


class VirtualNumberRepository(Repository[VirtualNumber]):
    model = VirtualNumber

    async def acquire_random_free(self, *, country: str, user_id: int) -> VirtualNumber | None:
        now = datetime.now(UTC)
        expires_at = now + timedelta(minutes=settings.number_lease_minutes)
        result = await self.session.execute(
            select(VirtualNumber)
            .where(VirtualNumber.country == country, VirtualNumber.status == NumberStatus.free)
            .order_by(func.random())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        number = result.scalar_one_or_none()
        if number is None:
            return None
        number.status = NumberStatus.busy
        number.assigned_to = user_id
        number.assigned_at = now
        number.expires_at = expires_at
        await self.session.flush()
        return number

    async def release_for_user(self, *, number_id: int, user_id: int) -> bool:
        result = await self.session.execute(
            update(VirtualNumber)
            .where(VirtualNumber.id == number_id, VirtualNumber.assigned_to == user_id)
            .values(status=NumberStatus.free, assigned_to=None, assigned_at=None, expires_at=None)
        )
        return bool(result.rowcount)

    async def release_expired(self) -> int:
        now = datetime.now(UTC)
        result = await self.session.execute(
            update(VirtualNumber)
            .where(VirtualNumber.status == NumberStatus.busy, VirtualNumber.expires_at <= now)
            .values(status=NumberStatus.expired, assigned_to=None, assigned_at=None)
        )
        await self.session.execute(
            update(VirtualNumber)
            .where(VirtualNumber.status == NumberStatus.expired)
            .values(status=NumberStatus.free, expires_at=None)
        )
        return int(result.rowcount or 0)
