from __future__ import annotations

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def send_telegram_message(telegram_id: int, text: str, *, parse_mode: str = "HTML") -> bool:
    bot = Bot(token=settings.telegram_bot_token)
    try:
        await bot.send_message(chat_id=telegram_id, text=text, parse_mode=parse_mode)
        return True
    except TelegramAPIError as exc:
        logger.warning("telegram_send_failed", telegram_id=telegram_id, error=str(exc))
        return False
    finally:
        await bot.session.close()
