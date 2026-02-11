from datetime import datetime, timezone

from fastapi import APIRouter, Header

from app.schemas.workspace import ToolType, WorkspaceProject, WorkspaceProjectsResponse
from app.services.integrations.factory import get_integration_adapter

router = APIRouter()

TENANT_CONFIG: dict[str, dict[str, str]] = {
    "tenant-acme": {"workspace_name": "Acme Quality Workspace", "primary_tool_type": ToolType.jira.value},
    "tenant-contoso": {"workspace_name": "Contoso Engineering QA", "primary_tool_type": ToolType.azure_devops.value},
}


@router.get("/projects", response_model=WorkspaceProjectsResponse)
def get_workspace_projects(
    x_tenant_id: str = Header(default="tenant-acme"),
    x_user_role: str = Header(default="qa_engineer"),
    x_user_id: str = Header(default="u-qa1"),
) -> WorkspaceProjectsResponse:
    tenant_meta = TENANT_CONFIG.get(
        x_tenant_id,
        {"workspace_name": "Default Workspace", "primary_tool_type": ToolType.jira.value},
    )
    tool_type = ToolType(tenant_meta["primary_tool_type"])
    adapter = get_integration_adapter(tool_type)

    healthy, status_message = adapter.check_health(x_tenant_id)
    raw_projects = adapter.list_projects(x_tenant_id)

    if x_user_role != "admin":
        raw_projects = [
            project
            for project in raw_projects
            if x_user_id in project.get("assigned_user_ids", []) or x_user_role == "manager"
        ]

    last_sync = datetime.now(timezone.utc).isoformat()
    projects = [
        WorkspaceProject(
            project_id=str(project["project_id"]),
            project_name=str(project["project_name"]),
            active_sprint=str(project["active_sprint"]),
            test_coverage_percent=int(project["test_coverage_percent"]),
            automation_coverage_percent=int(project["automation_coverage_percent"]),
            sprint_health_score=str(project["sprint_health_score"]),
            framework_type=str(project["framework_type"]),
            integration_type=tool_type,
            last_sync_time=last_sync,
            can_enter_project=healthy,
        )
        for project in raw_projects
    ]

    return WorkspaceProjectsResponse(
        workspace_name=tenant_meta["workspace_name"],
        integration_type=tool_type,
        integration_healthy=healthy,
        integration_status_message=status_message,
        last_sync_time=last_sync,
        can_configure_integration=x_user_role == "admin",
        projects=projects,
    )
