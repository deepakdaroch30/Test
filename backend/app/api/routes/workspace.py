from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.routes.integrations import is_workspace_ready
from app.core.database import get_db
from app.services.jira_service import get_jira_integration, get_projects

router = APIRouter()


def _map_workspace_projects(raw_projects: list[dict[str, object]], can_enter_project: bool, last_sync: str) -> list[dict[str, object]]:
    return [
        {
            "id": str(project.get("id", "")),
            "key": str(project.get("key", "")),
            "name": str(project.get("name", "")),
            "active_sprint": "Current Sprint",
            "last_sync_time": last_sync,
            "can_enter_project": can_enter_project,
        }
        for project in raw_projects
    ]


@router.get("/projects")
def get_workspace_projects(
    tenant_id: str | None = None,
    x_tenant_id: str = Header(default="tenant-acme"),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    resolved_tenant_id = tenant_id or x_tenant_id
    last_sync = datetime.now(timezone.utc).isoformat()

    try:
        jira_result = get_jira_integration(db, resolved_tenant_id)
        if not jira_result.get("success"):
            return {"success": False, "error": str(jira_result.get("error", "Jira integration not configured."))}

        data = jira_result.get("data")
        if not isinstance(data, dict):
            return {"success": False, "error": "Invalid Jira integration data."}

        projects_result = get_projects(
            str(data.get("base_url", "")),
            str(data.get("email", "")),
            str(data.get("api_token", "")),
        )
        if not projects_result.get("success"):
            return {"success": False, "error": str(projects_result.get("error", "Unable to fetch Jira projects."))}

        raw_projects = projects_result.get("data")
        if not isinstance(raw_projects, list):
            raw_projects = []

        can_enter_project = is_workspace_ready(db, resolved_tenant_id)
        return {
            "success": True,
            "data": _map_workspace_projects(raw_projects, can_enter_project, last_sync),
        }
    except Exception as exc:
        return {"success": False, "error": f"Unexpected error: {exc}"}
