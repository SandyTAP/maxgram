from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MaxGram Telegram OTP"
    app_env: Literal["local", "staging", "production"] = "local"
    debug: bool = False
    secret_key: str = Field(min_length=32)
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cookie_secure: bool = False
    cookie_domain: str | None = None
    site_url: str = "http://localhost"

    database_url: str
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    telegram_bot_token: str
    telegram_webhook_secret: str | None = None
    otp_ttl_seconds: int = 120
    otp_resend_cooldown_seconds: int = 45
    otp_verify_limit: int = 5
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    number_lease_minutes: int = 15

    admin_email: str = "admin@example.com"
    admin_password: str = Field(default="change-admin-password", min_length=8)

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, value: str | PostgresDsn) -> str:
        return str(value)

    @field_validator("redis_url", "celery_broker_url", "celery_result_backend", mode="before")
    @classmethod
    def validate_redis_url(cls, value: str | RedisDsn) -> str:
        return str(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
