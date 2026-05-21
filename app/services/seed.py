from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models import Admin, NumberStatus, VirtualNumber

DEFAULT_NUMBERS: dict[str, list[str]] = {
    "US": ["+12025550101", "+12025550102", "+12025550103", "+14155550104"],
    "RU": ["+79035550101", "+79035550102", "+79035550103", "+79165550104"],
    "GB": ["+442071838750", "+442071838751", "+442071838752", "+447700900123"],
}


async def seed_initial_data(session: AsyncSession) -> None:
    admin_exists = await session.scalar(select(Admin.id).where(Admin.email == settings.admin_email.lower()))
    if admin_exists is None:
        session.add(Admin(email=settings.admin_email.lower(), password_hash=hash_password(settings.admin_password)))

    count = await session.scalar(select(func.count(VirtualNumber.id)))
    if not count:
        for country, numbers in DEFAULT_NUMBERS.items():
            for phone_number in numbers:
                session.add(VirtualNumber(country=country, phone_number=phone_number, status=NumberStatus.free))
    await session.commit()
