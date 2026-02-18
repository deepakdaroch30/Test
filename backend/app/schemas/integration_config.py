from enum import Enum

from pydantic import BaseModel, Field


class ToolType(str, Enum):
    jira = "JIRA"
    azure_devops = "AZURE_DEVOPS"
    qtest = "QTEST"
    zephyr = "ZEPHYR"
    testrail = "TESTRAIL"


class AuthType(str, Enum):
    basic = "BASIC"
    oauth1 = "OAUTH1"
    oauth2 = "OAUTH2"
    cookie = "COOKIE"
    pat = "PAT"
    token = "TOKEN"


class IntegrationState(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    token_expired = "token_expired"


class IntegrationTestRequest(BaseModel):
    tenant_id: str
    tool_type: ToolType
    auth_type: AuthType
    base_url: str
    credentials: dict[str, str]
    webhook_secret: str


class IntegrationSaveRequest(IntegrationTestRequest):
    default_project: str | None = None
    reset_confirmed: bool = False


class IntegrationStatusResponse(BaseModel):
    tenant_id: str
    tool_type: ToolType | None = None
    auth_type: AuthType | None = None
    integration_status: IntegrationState
    last_successful_sync: str | None = None
    last_tested_timestamp: str | None = None
    last_error_message: str | None = None
    connected: bool
    configuration_locked: bool


class IntegrationActionResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    message: str
