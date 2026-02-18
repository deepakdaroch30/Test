# Architecture Blueprint

## Core services

- **API Gateway (FastAPI)**: REST + OpenAPI, JWT auth, RBAC enforcement.
- **Async Workers (Celery + Redis)**: AI generation, repo sync, webhook post-processing.
- **PostgreSQL**: multi-tenant transactional store.
- **Integration adapters**:
  - Jira Cloud adapter
  - GitHub adapter (MVP)
  - CI adapters (GitHub Actions MVP, Jenkins-ready)
- **AI provider layer**:
  - OpenAI primary
  - Gemini optional
  - Ollama self-hosted fallback
  - Unified prompt/response logging

## Domain modules

1. Project Initialization
2. Sprint Ingestion
3. Requirement Quality Analyzer
4. Test Case Generation
5. Risk Scoring
6. RTM Maintenance
7. Automation Script Generation
8. CI Execution Listener
9. Definition of Done Validator
10. Sprint Quality Dashboard

## Governance & security

- Prompt versioning + token usage telemetry.
- API key encryption at rest.
- Tenant-scoped access controls.
- Immutable project framework configuration.
- Audit logging for all state-changing actions.
