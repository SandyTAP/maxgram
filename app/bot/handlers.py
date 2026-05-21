from __future__ import annotations

from datetime import UTC, datetime

from aiogram import Router
from aiogram.filters import CommandStart, Command
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select

from app.bot.keyboards import COUNTRIES, country_menu, main_menu, number_actions
from app.db.session import AsyncSessionLocal
from app.models import LoginHistory, OTPCode, User, VirtualNumber
from app.repositories.audit import NotificationRepository
from app.repositories.numbers import VirtualNumberRepository
from app.repositories.users import TelegramRepository, UserRepository
from app.models.enums import NotificationType

router = Router()


async def ensure_account(message: Message) -> None:
    async with AsyncSessionLocal() as session:
        await TelegramRepository(session).upsert_from_message(
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
        )
        await session.commit()


@router.message(CommandStart())
async def start(message: Message) -> None:
    await ensure_account(message)
    await message.answer(
        "<b>👋 Добро пожаловать в MaxGram</b>\n\n"
        "Этот бот получает OTP-коды для входа на сайт и выдает временные виртуальные номера.\n\n"
        f"Ваш Telegram ID: <code>{message.from_user.id}</code>\n"
        "Введите этот ID на сайте при регистрации или входе.",
        reply_markup=main_menu(),
    )


@router.message(Command("cabinet"))
async def cabinet_command(message: Message) -> None:
    await send_cabinet(message)


async def send_cabinet(message: Message | CallbackQuery) -> None:
    telegram_id = message.from_user.id
    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_telegram_id(telegram_id)
        if user is None:
            text = "<b>👤 Кабинет</b>\n\nАккаунт сайта пока не привязан. Введите этот Telegram ID на сайте."
        else:
            login_count = len((await session.execute(select(LoginHistory).where(LoginHistory.user_id == user.id))).scalars().all())
            active_numbers = (await session.execute(select(VirtualNumber).where(VirtualNumber.assigned_to == user.id))).scalars().all()
            text = (
                "<b>👤 Кабинет MaxGram</b>\n\n"
                f"Email: <b>{user.email}</b>\n"
                f"Username: <code>{user.username}</code>\n"
                f"Входов в истории: <b>{login_count}</b>\n"
                f"Активных номеров: <b>{len(active_numbers)}</b>"
            )
    if isinstance(message, CallbackQuery):
        await message.message.edit_text(text, reply_markup=main_menu())
        await message.answer()
    else:
        await message.answer(text, reply_markup=main_menu())


@router.message(Command("history"))
async def history_command(message: Message) -> None:
    await send_history(message)


async def send_history(message: Message | CallbackQuery) -> None:
    telegram_id = message.from_user.id
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(select(OTPCode).where(OTPCode.telegram_id == telegram_id).order_by(OTPCode.created_at.desc()).limit(10))).scalars().all()
    if not rows:
        text = "<b>🧾 История OTP</b>\n\nКодов пока не было."
    else:
        lines = ["<b>🧾 Последние OTP-коды</b>"]
        for row in rows:
            status = "использован" if row.is_used else ("истек" if row.expires_at < datetime.now(UTC) else "активен")
            lines.append(f"• {row.created_at:%d.%m %H:%M} — {status}")
        text = "\n".join(lines)
    if isinstance(message, CallbackQuery):
        await message.message.edit_text(text, reply_markup=main_menu())
        await message.answer()
    else:
        await message.answer(text, reply_markup=main_menu())


@router.callback_query(lambda call: call.data == "menu")
async def menu(call: CallbackQuery) -> None:
    await call.message.edit_text("<b>MaxGram</b>\n\nВыберите действие:", reply_markup=main_menu())
    await call.answer()


@router.callback_query(lambda call: call.data == "cabinet")
async def cabinet_callback(call: CallbackQuery) -> None:
    await send_cabinet(call)


@router.callback_query(lambda call: call.data == "otp_history")
async def history_callback(call: CallbackQuery) -> None:
    await send_history(call)


@router.callback_query(lambda call: call.data == "numbers")
async def numbers(call: CallbackQuery) -> None:
    await call.message.edit_text("<b>🌍 Выберите страну номера</b>", reply_markup=country_menu())
    await call.answer()


@router.callback_query(lambda call: call.data and call.data.startswith("country:"))
async def acquire_number(call: CallbackQuery) -> None:
    country = call.data.split(":", 1)[1]
    if country not in COUNTRIES:
        await call.answer("Страна не поддерживается", show_alert=True)
        return
    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_telegram_id(call.from_user.id)
        if user is None:
            await call.answer("Сначала привяжите аккаунт на сайте", show_alert=True)
            return
        repo = VirtualNumberRepository(session)
        number = await repo.acquire_random_free(country=country, user_id=user.id)
        if number is None:
            await session.rollback()
            await call.answer("Свободных номеров сейчас нет", show_alert=True)
            return
        await NotificationRepository(session).write(
            user_id=user.id,
            telegram_id=call.from_user.id,
            title="Номер выдан",
            message=f"Выдан номер {number.phone_number}",
            type=NotificationType.number,
            is_sent=True,
        )
        await session.commit()
    await call.message.edit_text(
        "<b>📲 Номер выдан</b>\n\n"
        f"Страна: <b>{COUNTRIES[country]}</b>\n"
        f"Номер: <code>{number.phone_number}</code>\n"
        f"Аренда до: <b>{number.expires_at:%H:%M UTC}</b>\n\n"
        "Пока номер занят вами, другой пользователь его не получит.",
        reply_markup=number_actions(number.id),
    )
    await call.answer("Номер закреплен за вами")


@router.callback_query(lambda call: call.data and call.data.startswith("release:"))
async def release_number(call: CallbackQuery) -> None:
    number_id = int(call.data.split(":", 1)[1])
    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_telegram_id(call.from_user.id)
        if user is None:
            await call.answer("Аккаунт не привязан", show_alert=True)
            return
        released = await VirtualNumberRepository(session).release_for_user(number_id=number_id, user_id=user.id)
        await session.commit()
    if released:
        await call.message.edit_text("<b>✅ Номер освобожден</b>\n\nОн снова доступен другим пользователям.", reply_markup=main_menu())
        await call.answer("Сессия завершена")
    else:
        await call.answer("Номер не найден или уже освобожден", show_alert=True)
