from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery_app = Celery("maxgram", broker=settings.celery_broker_url, backend=settings.celery_result_backend)
celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "cleanup-expired-otp-every-minute": {
        "task": "app.worker.tasks.cleanup_expired_otp",
        "schedule": 60.0,
    },
    "cleanup-expired-sessions-every-five-minutes": {
        "task": "app.worker.tasks.cleanup_expired_sessions",
        "schedule": 300.0,
    },
    "release-expired-numbers-every-minute": {
        "task": "app.worker.tasks.release_expired_numbers",
        "schedule": 60.0,
    },
}
celery_app.autodiscover_tasks(["app.worker"])
