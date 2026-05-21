from __future__ import annotations

from datetime import UTC, datetime
import re
from secrets import token_hex

from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, csrf_matches, verify_password
from app.db.redis import get_redis
from app.db.session import get_db
from app.models import Admin, NotificationType, User
from app.repositories.audit import LoginHistoryRepository, NotificationRepository
from app.repositories.users import UserRepository
from app.services.auth import ADMIN_COOKIE_NAME, clear_auth_cookie, client_ip, create_user_session, set_auth_cookie, user_agent
from app.services.otp import OTPService
from app.services.telegram import send_telegram_message

router = APIRouter(tags=["auth"])
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,64}$")


@router.post("/auth/request")
async def request_otp(
    request: Request,
    email: str = Form(...),
    username: str = Form(...),
    telegram_id: int = Form(...),
    csrf_token: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not csrf_matches(request.cookies.get("csrf_token"), csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Username must contain 3-64 letters, digits, dots, dashes or underscores")

    user = await UserRepository(db).create_or_update_site_user(email=email, username=username, telegram_id=telegram_id)
    try:
        await OTPService(db, get_redis()).issue_login_code(
            user_id=user.id,
            email=user.email,
            telegram_id=telegram_id,
            ip_address=client_ip(request),
        )
    except ValueError as exc:
        await db.rollback()
        response = RedirectResponse(f"/login?error={str(exc)}", status_code=status.HTTP_303_SEE_OTHER)
        return response
    await LoginHistoryRepository(db).write(
        user_id=user.id,
        ip_address=client_ip(request),
        user_agent=user_agent(request),
        success=False,
        reason="otp_sent",
    )
    await db.commit()
    response = RedirectResponse(f"/verify?email={user.email}", status_code=status.HTTP_303_SEE_OTHER)
    return response


@router.post("/auth/verify")
async def verify_otp(
    request: Request,
    email: str = Form(...),
    code: str = Form(...),
    csrf_token: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not csrf_matches(request.cookies.get("csrf_token"), csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    user = await UserRepository(db).get_by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    normalized_code = "".join(ch for ch in code if ch.isdigit())
    ok = await OTPService(db, get_redis()).verify_login_code(user_id=user.id, code=normalized_code)
    if not ok:
        await LoginHistoryRepository(db).write(
            user_id=user.id,
            ip_address=client_ip(request),
            user_agent=user_agent(request),
            success=False,
            reason="invalid_otp",
        )
        await db.commit()
        return RedirectResponse(f"/verify?email={user.email}&error=Неверный или устаревший код", status_code=303)

    user.is_verified = True
    token, _ = await create_user_session(db, user=user, request=request)
    await LoginHistoryRepository(db).write(
        user_id=user.id,
        ip_address=client_ip(request),
        user_agent=user_agent(request),
        success=True,
        reason="otp_verified",
    )
    if user.telegram_account:
        sent = await send_telegram_message(
            user.telegram_account.telegram_id,
            "<b>✅ Вход выполнен</b>\n\nНовая сессия MaxGram успешно создана.",
        )
        await NotificationRepository(db).write(
            user_id=user.id,
            telegram_id=user.telegram_account.telegram_id,
            title="Вход выполнен",
            message="Создана новая веб-сессия.",
            type=NotificationType.login,
            is_sent=sent,
        )
    await db.commit()
    response = RedirectResponse("/dashboard", status_code=303)
    set_auth_cookie(response, token)
    return response


@router.post("/logout")
async def logout(response: Response) -> RedirectResponse:
    redirect = RedirectResponse("/login", status_code=303)
    clear_auth_cookie(redirect)
    return redirect


@router.post("/admin/login")
async def admin_login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    csrf_token: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not csrf_matches(request.cookies.get("csrf_token"), csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    result = await db.execute(select(Admin).where(Admin.email == email.lower()))
    admin = result.scalar_one_or_none()
    if admin is None or not verify_password(password, admin.password_hash):
        return RedirectResponse("/admin/login?error=Неверные данные", status_code=303)
    token = create_access_token(str(admin.id), extra={"jti": token_hex(16), "type": "admin"})
    response = RedirectResponse("/admin", status_code=303)
    set_auth_cookie(response, token, name=ADMIN_COOKIE_NAME)
    return response


@router.post("/admin/logout")
async def admin_logout() -> RedirectResponse:
    response = RedirectResponse("/admin/login", status_code=303)
    clear_auth_cookie(response, name=ADMIN_COOKIE_NAME)
    return response
