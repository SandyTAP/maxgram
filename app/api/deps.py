from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.db.session import get_db
from app.models import Admin, User, UserSession
from app.services.auth import ADMIN_COOKIE_NAME, COOKIE_NAME, decode_cookie_token


async def current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_cookie_token(request.cookies.get(COOKIE_NAME))
    if not payload or payload.get("type") != "user" or not payload.get("jti"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    result = await db.execute(
        select(UserSession).where(
            UserSession.jti == payload["jti"],
            UserSession.user_id == int(payload["sub"]),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(UTC),
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    return user


async def current_admin(request: Request, db: AsyncSession = Depends(get_db)) -> Admin:
    payload = decode_cookie_token(request.cookies.get(ADMIN_COOKIE_NAME))
    if not payload or payload.get("type") != "admin" or not payload.get("jti"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin authentication required")
    if not await get_redis().exists(f"admin_session:{payload['jti']}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session expired")
    admin = await db.get(Admin, int(payload["sub"]))
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin")
    return admin
