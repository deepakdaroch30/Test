from enum import Enum

from pydantic import BaseModel, Field


class ToolType(str, Enum):
    jira = "JIRA"
    azure_devops = "AZURE_DEVOPS"


class IntegrationState(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    token_expired = "token_expired"


class IntegrationTestRequest(BaseModel):
    tenant_id: str
    tool_type: ToolType
    base_url: str
    client_id: str | None = None
    client_secret: str | None = None
    api_token: str | None = None
    tenant_identifier: str | None = None
    personal_access_token: str | None = None
    webhook_secret: str


class IntegrationSaveRequest(IntegrationTestRequest):
    default_project: str | None = None
    reset_confirmed: bool = False


class IntegrationStatusResponse(BaseModel):
    tenant_id: str
    tool_type: ToolType | None = None
    integration_status: IntegrationState
    last_successful_sync: str | None = None
    last_tested_timestamp: str | None = None
    last_error_message: str | None = None
    connected: bool
    configuration_locked: bool


class IntegrationActionResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    message: str
