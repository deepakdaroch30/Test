from celery import Celery

from app.core.config import settings

celery_app = Celery("qa_orchestrator", broker=settings.redis_url, backend=settings.redis_url)


@celery_app.task(name="workers.health")
def workers_health() -> str:
    return "ok"
