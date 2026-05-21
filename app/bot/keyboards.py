from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

COUNTRIES = {
    "US": "🇺🇸 США (+1)",
    "RU": "🇷🇺 Россия (+7)",
    "GB": "🇬🇧 Великобритания (+44)",
}


def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👤 Личный кабинет", callback_data="cabinet")],
        [InlineKeyboardButton(text="📲 Получить номер", callback_data="numbers")],
        [InlineKeyboardButton(text="🧾 История OTP", callback_data="otp_history")],
    ])


def country_menu() -> InlineKeyboardMarkup:
    rows = [[InlineKeyboardButton(text=label, callback_data=f"country:{code}")] for code, label in COUNTRIES.items()]
    rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def number_actions(number_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Завершить сессию и освободить номер", callback_data=f"release:{number_id}")],
        [InlineKeyboardButton(text="⬅️ Меню", callback_data="menu")],
    ])
