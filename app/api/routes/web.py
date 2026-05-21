from __future__ import annotations

from secrets import token_urlsafe

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import LoginHistory, Notification, OTPCode, User, UserSession, VirtualNumber
from app.models.enums import NumberStatus
from app.web.templating import templates

router = APIRouter(include_in_schema=False)


def render_with_csrf(request: Request, template: str, context: dict) -> HTMLResponse:
    token = token_urlsafe(32)
    response = templates.TemplateResponse(request, template, {**context, "csrf_token": token, "settings": settings})
    response.set_cookie("csrf_token", token, httponly=False, secure=settings.cookie_secure, samesite="lax")
    return response


@router.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return render_with_csrf(request, "index.html", {})


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str | None = None) -> HTMLResponse:
    return render_with_csrf(request, "login.html", {"error": error})


@router.get("/verify", response_class=HTMLResponse)
async def verify_page(request: Request, email: str, error: str | None = None) -> HTMLResponse:
    return render_with_csrf(request, "verify.html", {"email": email, "error": error, "otp_ttl": settings.otp_ttl_seconds})


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    login_rows = await db.execute(
        select(LoginHistory).where(LoginHistory.user_id == user.id).order_by(LoginHistory.created_at.desc()).limit(10)
    )
    otp_rows = await db.execute(select(OTPCode).where(OTPCode.user_id == user.id).order_by(OTPCode.created_at.desc()).limit(10))
    session_rows = await db.execute(select(UserSession).where(UserSession.user_id == user.id).order_by(UserSession.created_at.desc()).limit(10))
    number_rows = await db.execute(select(VirtualNumber).where(VirtualNumber.assigned_to == user.id).order_by(VirtualNumber.assigned_at.desc()))
    notification_rows = await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(10)
    )
    return render_with_csrf(
        request,
        "dashboard.html",
        {
            "user": user,
            "logins": login_rows.scalars().all(),
            "otps": otp_rows.scalars().all(),
            "sessions": session_rows.scalars().all(),
            "numbers": number_rows.scalars().all(),
            "notifications": notification_rows.scalars().all(),
        },
    )


@router.get("/admin/login", response_class=HTMLResponse)
async def admin_login_page(request: Request, error: str | None = None) -> HTMLResponse:
    return render_with_csrf(request, "admin_login.html", {"error": error})


@router.get("/admin", response_class=HTMLResponse)
async def admin_panel(request: Request, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    from app.services.auth import ADMIN_COOKIE_NAME, decode_cookie_token
    from app.models import Admin

    payload = decode_cookie_token(request.cookies.get(ADMIN_COOKIE_NAME))
    if not payload or payload.get("type") != "admin" or await db.get(Admin, int(payload["sub"])) is None:
        return RedirectResponse("/admin/login", status_code=303)

    users_count = await db.scalar(select(User).count()) if False else None
    users = (await db.execute(select(User).order_by(User.created_at.desc()).limit(50))).scalars().all()
    numbers = (await db.execute(select(VirtualNumber).order_by(VirtualNumber.country, VirtualNumber.phone_number))).scalars().all()
    busy_count = len([number for number in numbers if number.status == NumberStatus.busy])
    return render_with_csrf(
        request,
        "admin.html",
        {"users": users, "numbers": numbers, "busy_count": busy_count},
    )
