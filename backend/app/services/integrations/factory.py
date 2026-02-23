from enum import Enum

from app.schemas.workspace import ToolType
from app.services.integrations.ado import AdoAdapter
from app.services.integrations.base import BaseIntegrationAdapter
from app.services.integrations.jira import JiraAdapter


_TOOL_ALIASES = {
    "ADO": "AZURE_DEVOPS",
    "AZDO": "AZURE_DEVOPS",
    "AZUREDEVOPS": "AZURE_DEVOPS",
}


def _normalize_tool_type(tool_type: ToolType | str | Enum) -> str:
    raw = tool_type.value if isinstance(tool_type, Enum) else str(tool_type)
    value = raw.strip().upper()

    if value.startswith("TOOLTYPE."):
        value = value.split(".", maxsplit=1)[1]

    return _TOOL_ALIASES.get(value, value)


def get_integration_adapter(tool_type: ToolType | str | Enum) -> BaseIntegrationAdapter:
    normalized_tool_type = _normalize_tool_type(tool_type)

    if normalized_tool_type == ToolType.jira.value:
        return JiraAdapter()
    if normalized_tool_type == ToolType.azure_devops.value:
        return AdoAdapter()

    raise ValueError(f"Unsupported tool type: {tool_type}")
