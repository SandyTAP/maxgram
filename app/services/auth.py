from __future__ import annotations

from datetime import UTC, datetime, timedelta
from secrets import token_hex

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.models import User, UserSession
from app.repositories.audit import UserSessionRepository

COOKIE_NAME = "access_token"
ADMIN_COOKIE_NAME = "admin_access_token"


def client_ip(request: Request) -> str | None:
    value = request.headers.get("x-forwarded-for")
    if value:
        return value.split(",")[0].strip()
    return request.client.host if request.client else None


def user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


async def create_user_session(session: AsyncSession, *, user: User, request: Request) -> tuple[str, UserSession]:
    jti = token_hex(16)
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    token = create_access_token(str(user.id), extra={"jti": jti, "type": "user"})
    db_session = UserSession(
        user_id=user.id,
        jti=jti,
        ip_address=client_ip(request),
        user_agent=user_agent(request),
        expires_at=expires_at,
    )
    await UserSessionRepository(session).add(db_session)
    return token, db_session


def set_auth_cookie(response, token: str, *, name: str = COOKIE_NAME) -> None:
    response.set_cookie(
        name,
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        domain=settings.cookie_domain,
    )


def clear_auth_cookie(response, *, name: str = COOKIE_NAME) -> None:
    response.delete_cookie(name, domain=settings.cookie_domain)


def decode_cookie_token(token: str | None) -> dict | None:
    if not token:
        return None
    try:
        return decode_access_token(token)
    except Exception:
        return None
