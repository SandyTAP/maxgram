from __future__ import annotations

from datetime import UTC, datetime, timedelta
from random import SystemRandom

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_otp
from app.models.enums import NotificationType
from app.models import OTPCode
from app.repositories.audit import NotificationRepository, OTPRepository
from app.services.telegram import send_telegram_message

_rng = SystemRandom()


class OTPService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis

    async def issue_login_code(self, *, user_id: int, email: str, telegram_id: int, ip_address: str | None) -> str:
        cooldown_key = f"otp:cooldown:{user_id}"
        if await self.redis.exists(cooldown_key):
            ttl = await self.redis.ttl(cooldown_key)
            raise ValueError(f"Повторная отправка будет доступна через {ttl} сек.")

        code = f"{_rng.randint(0, 999999):06d}"
        code_key = f"otp:login:{user_id}"
        attempts_key = f"otp:attempts:{user_id}"
        expires_at = datetime.now(UTC) + timedelta(seconds=settings.otp_ttl_seconds)

        await self.redis.set(code_key, code, ex=settings.otp_ttl_seconds)
        await self.redis.delete(attempts_key)
        await self.redis.set(cooldown_key, "1", ex=settings.otp_resend_cooldown_seconds)

        await OTPRepository(self.session).create_record(
            user_id=user_id,
            telegram_id=telegram_id,
            code_hash=hash_otp(code),
            expires_at=expires_at,
        )
        text = (
            "<b>🔐 MaxGram OTP</b>\n\n"
            f"Код входа: <code>{code}</code>\n"
            f"Действует {settings.otp_ttl_seconds // 60} минуты.\n\n"
            f"Аккаунт: <b>{email}</b>\n"
            f"IP: <code>{ip_address or 'unknown'}</code>\n\n"
            "Если это были не вы, не сообщайте код никому."
        )
        sent = await send_telegram_message(telegram_id, text)
        await NotificationRepository(self.session).write(
            user_id=user_id,
            telegram_id=telegram_id,
            title="Новый OTP код",
            message="Код входа отправлен в Telegram.",
            type=NotificationType.otp,
            is_sent=sent,
        )
        return code

    async def verify_login_code(self, *, user_id: int, code: str) -> bool:
        attempts_key = f"otp:attempts:{user_id}"
        attempts = await self.redis.incr(attempts_key)
        if attempts == 1:
            await self.redis.expire(attempts_key, settings.otp_ttl_seconds)
        if attempts > settings.otp_verify_limit:
            return False

        code_key = f"otp:login:{user_id}"
        expected = await self.redis.get(code_key)
        if expected is None or expected != code:
            return False
        await self.redis.delete(code_key, attempts_key)
        result = await self.session.execute(
            select(OTPCode)
            .where(OTPCode.user_id == user_id, OTPCode.is_used.is_(False))
            .order_by(OTPCode.created_at.desc())
            .limit(1)
        )
        record = result.scalar_one_or_none()
        if record is not None:
            record.is_used = True
            record.used_at = datetime.now(UTC)
        return True
