from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response
import structlog

from app.api.routes import admin, api, auth, health, web
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import RedisRateLimitMiddleware
from app.db.redis import close_redis
from app.db.session import AsyncSessionLocal
from app.services.seed import seed_initial_data

configure_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
    logger.info("app_started", env=settings.app_env)
    yield
    await close_redis()
    logger.info("app_stopped")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)
app.add_middleware(RedisRateLimitMiddleware)
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(api.router)
app.include_router(admin.router)
app.include_router(web.router)


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    return ORJSONResponse({"detail": "Not found"}, status_code=404)


@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    logger.exception("server_error", path=str(request.url.path), error=str(exc))
    return ORJSONResponse({"detail": "Internal server error"}, status_code=500)


@app.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
