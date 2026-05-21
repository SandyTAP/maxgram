from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LoginHistory, Notification, OTPCode, UserSession
from app.models.enums import NotificationType, OTPPurpose
from app.repositories.base import Repository


class OTPRepository(Repository[OTPCode]):
    model = OTPCode

    async def create_record(
        self,
        *,
        user_id: int,
        telegram_id: int,
        code_hash: str,
        expires_at: datetime,
        purpose: OTPPurpose = OTPPurpose.login,
    ) -> OTPCode:
        item = OTPCode(user_id=user_id, telegram_id=telegram_id, code_hash=code_hash, expires_at=expires_at, purpose=purpose)
        self.session.add(item)
        await self.session.flush()
        return item

    async def recent_for_user(self, user_id: int, limit: int = 10) -> list[OTPCode]:
        result = await self.session.execute(
            select(OTPCode).where(OTPCode.user_id == user_id).order_by(OTPCode.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


class LoginHistoryRepository(Repository[LoginHistory]):
    model = LoginHistory

    async def write(self, *, user_id: int, ip_address: str | None, user_agent: str | None, success: bool, reason: str | None) -> None:
        self.session.add(LoginHistory(user_id=user_id, ip_address=ip_address, user_agent=user_agent, success=success, reason=reason))
        await self.session.flush()


class UserSessionRepository(Repository[UserSession]):
    model = UserSession


class NotificationRepository(Repository[Notification]):
    model = Notification

    async def write(
        self,
        *,
        user_id: int | None,
        telegram_id: int | None,
        title: str,
        message: str,
        type: NotificationType,
        is_sent: bool = False,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            telegram_id=telegram_id,
            title=title,
            message=message,
            type=type,
            is_sent=is_sent,
        )
        self.session.add(notification)
        await self.session.flush()
        return notification
