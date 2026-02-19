# Veloryn (MVP Scaffold)

This repository provides a starter implementation for an **AI engineering intelligence and automation orchestration platform**.

## Implemented foundations

- **FastAPI backend** with module-oriented API surface for:
  - Auth
  - Project initialization (one-time immutable configuration intent)
  - Story ingestion
  - AI requirement quality analysis
  - AI test case generation (includes negative tests)
  - RTM coverage endpoint
  - Definition of Done validation
  - Sprint quality dashboard
- **Pluggable integration endpoints** for Jira and GitHub (MVP placeholders)
- **Celery worker bootstrap** with Redis broker
- **Docker Compose** stack for API, worker, PostgreSQL, Redis, and Next.js frontend
- **Next.js frontend scaffold**

## Run locally

```bash
docker compose up --build
```

- API docs: http://localhost:8000/api/v1/docs
- Frontend: http://localhost:3000


## Quick static preview

Open `frontend/preview.html` in a browser to see a static, CXO-style sprint quality dashboard mock.

## Multi-page design preview

Open `frontend/design/index.html` to browse static designs for each major MVP page/module.

## Suggested next implementation increments

1. Persist domain entities in PostgreSQL (SQLAlchemy + Alembic migrations).
2. Introduce tenant-aware auth and RBAC middleware.
3. Replace stub AI endpoints with provider abstraction (OpenAI/Gemini/Ollama).
4. Add Jira Cloud and GitHub REST clients with encrypted credential storage.
5. Build RTM + risk scoring services and dashboard aggregation queries.
6. Add webhook listener for CI execution ingestion.
