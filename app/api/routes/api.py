from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db.session import get_db
from app.models import User

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/me")
async def me(user: User = Depends(current_user)) -> dict[str, object]:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "is_verified": user.is_verified,
        "telegram_id": user.telegram_account.telegram_id if user.telegram_account else None,
    }
