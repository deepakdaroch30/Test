from fastapi import APIRouter

from app.api.routes import ai, auth, dashboard, dod, integrations, integrations_jira, integrations_zephyr, project_overview, projects, rtm, stories, testcases, workspace

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(stories.router, prefix="/stories", tags=["stories"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(testcases.router, prefix="/test-cases", tags=["test-cases"])
api_router.include_router(rtm.router, prefix="/rtm", tags=["rtm"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(dod.router, prefix="/definition-of-done", tags=["definition-of-done"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
api_router.include_router(project_overview.router, prefix="/project", tags=["project-overview"])

api_router.include_router(integrations_zephyr.router, prefix="/integrations/zephyr", tags=["integrations-zephyr"])
api_router.include_router(integrations_jira.router, prefix="/integrations/jira", tags=["integrations-jira"])
