from app.schemas.workspace import ToolType
from app.services.integrations.ado import AdoAdapter
from app.services.integrations.base import BaseIntegrationAdapter
from app.services.integrations.jira import JiraAdapter


def get_integration_adapter(tool_type: ToolType) -> BaseIntegrationAdapter:
    match tool_type:
        case ToolType.jira:
            return JiraAdapter()
        case ToolType.azure_devops:
            return AdoAdapter()
        case _:
            raise ValueError(f"Unsupported tool type: {tool_type}")
