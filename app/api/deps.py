from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Admin, User
from app.services.auth import ADMIN_COOKIE_NAME, COOKIE_NAME, decode_cookie_token


async def current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_cookie_token(request.cookies.get(COOKIE_NAME))
    if not payload or payload.get("type") != "user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    return user


async def current_admin(request: Request, db: AsyncSession = Depends(get_db)) -> Admin:
    payload = decode_cookie_token(request.cookies.get(ADMIN_COOKIE_NAME))
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin authentication required")
    admin = await db.get(Admin, int(payload["sub"]))
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin")
    return admin
