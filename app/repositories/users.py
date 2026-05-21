from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TelegramAccount, User
from app.repositories.base import Repository


class UserRepository(Repository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(select(User).where(User.username == username.lower()))
        return result.scalar_one_or_none()

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.session.execute(
            select(User).join(TelegramAccount).where(TelegramAccount.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def create_or_update_site_user(self, *, email: str, username: str, telegram_id: int) -> User:
        email = email.lower().strip()
        username = username.lower().strip()
        user = await self.get_by_email(email)
        if user is None:
            user = User(email=email, username=username)
            self.session.add(user)
            await self.session.flush()
        else:
            user.username = username
        account = await TelegramRepository(self.session).get_by_telegram_id(telegram_id)
        if account is None:
            account = TelegramAccount(telegram_id=telegram_id, user_id=user.id)
            self.session.add(account)
        else:
            account.user_id = user.id
        await self.session.flush()
        return user


class TelegramRepository(Repository[TelegramAccount]):
    model = TelegramAccount

    async def get_by_telegram_id(self, telegram_id: int) -> TelegramAccount | None:
        result = await self.session.execute(select(TelegramAccount).where(TelegramAccount.telegram_id == telegram_id))
        return result.scalar_one_or_none()

    async def upsert_from_message(
        self,
        *,
        telegram_id: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
    ) -> TelegramAccount:
        account = await self.get_by_telegram_id(telegram_id)
        if account is None:
            account = TelegramAccount(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
            )
            self.session.add(account)
        else:
            account.username = username
            account.first_name = first_name
            account.last_name = last_name
            account.is_blocked = False
        await self.session.flush()
        return account
