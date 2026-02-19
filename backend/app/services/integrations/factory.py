from app.schemas.workspace import ToolType
from app.services.integrations.ado import AdoAdapter
from app.services.integrations.base import BaseIntegrationAdapter
from app.services.integrations.jira import JiraAdapter


def get_integration_adapter(tool_type: ToolType) -> BaseIntegrationAdapter:
    if tool_type == ToolType.jira:
        return JiraAdapter()
    return AdoAdapter()
