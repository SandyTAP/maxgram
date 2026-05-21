from __future__ import annotations

from collections.abc import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.db.redis import get_redis


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if request.url.path.startswith(("/static", "/health", "/metrics")):
            return await call_next(request)

        forwarded_for = request.headers.get("x-forwarded-for")
        client_ip = forwarded_for.split(",")[-1].strip() if forwarded_for else (request.client.host if request.client else "unknown")
        key = f"rate:{client_ip}:{request.url.path}"
        redis = get_redis()
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, settings.rate_limit_window_seconds)
        if current > settings.rate_limit_requests:
            return JSONResponse({"detail": "Too many requests"}, status_code=429)
        return await call_next(request)
