from __future__ import annotations

from enum import StrEnum


class NumberStatus(StrEnum):
    free = "free"
    busy = "busy"
    banned = "banned"
    expired = "expired"


class OTPPurpose(StrEnum):
    login = "login"
    binding = "binding"


class NotificationType(StrEnum):
    login = "login"
    otp = "otp"
    number = "number"
    system = "system"
