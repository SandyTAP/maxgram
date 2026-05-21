from __future__ import annotations

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_admin
from app.core.security import csrf_matches
from app.db.session import get_db
from app.models import Admin, NumberStatus, VirtualNumber

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/numbers")
async def add_number(
    request: Request,
    country: str = Form(...),
    phone_number: str = Form(...),
    csrf_token: str = Form(...),
    _: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not csrf_matches(request.cookies.get("csrf_token"), csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    normalized_country = country.upper()
    if normalized_country not in {"US", "RU", "GB"}:
        raise HTTPException(status_code=400, detail="Unsupported country")
    db.add(VirtualNumber(country=normalized_country, phone_number=phone_number.strip(), status=NumberStatus.free))
    await db.commit()
    return RedirectResponse("/admin", status_code=303)


@router.post("/numbers/{number_id}/status")
async def set_number_status(
    request: Request,
    number_id: int,
    status: NumberStatus = Form(...),
    csrf_token: str = Form(...),
    _: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not csrf_matches(request.cookies.get("csrf_token"), csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    number = await db.get(VirtualNumber, number_id)
    if number is None:
        raise HTTPException(status_code=404, detail="Number not found")
    number.status = status
    if status == NumberStatus.free:
        number.assigned_to = None
        number.assigned_at = None
        number.expires_at = None
    await db.commit()
    return RedirectResponse("/admin", status_code=303)
