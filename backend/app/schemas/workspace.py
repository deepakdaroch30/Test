from enum import Enum

from pydantic import BaseModel, Field


class ToolType(str, Enum):
    jira = "JIRA"
    azure_devops = "AZURE_DEVOPS"


class FrameworkType(str, Enum):
    playwright = "Playwright"
    selenium = "Selenium"


class SprintHealth(str, Enum):
    green = "green"
    amber = "amber"
    red = "red"


class WorkspaceProject(BaseModel):
    project_id: str
    project_name: str
    active_sprint: str
    test_coverage_percent: int = Field(ge=0, le=100)
    automation_coverage_percent: int = Field(ge=0, le=100)
    sprint_health_score: SprintHealth
    framework_type: FrameworkType
    integration_type: ToolType
    last_sync_time: str
    can_enter_project: bool = True


class WorkspaceProjectsResponse(BaseModel):
    workspace_name: str
    integration_type: ToolType
    integration_healthy: bool
    integration_status_message: str
    last_sync_time: str
    can_configure_integration: bool
    projects: list[WorkspaceProject]
