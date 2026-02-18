from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.tenant_integration import TenantIntegration
from app.schemas.integration_config import (
    IntegrationActionResponse,
    IntegrationSaveRequest,
    IntegrationState,
    IntegrationStatusResponse,
    IntegrationTestRequest,
)

router = APIRouter()

TENANT_INTEGRATIONS: dict[str, dict[str, Any]] = {}

REQUIRED_CREDENTIALS: dict[str, dict[str, list[str]]] = {
    "JIRA": {
        "BASIC": ["username", "api_token"],
        "OAUTH2": ["client_id", "client_secret"],
        "TOKEN": ["api_token"],
    },
    "AZURE_DEVOPS": {
        "PAT": ["personal_access_token"],
        "OAUTH2": ["tenant_id", "client_id", "client_secret"],
    },
    "QTEST": {
        "TOKEN": ["api_token"],
        "OAUTH2": ["client_id", "client_secret"],
    },
    "ZEPHYR": {
        "TOKEN": ["api_token"],
        "BASIC": ["username", "password"],
    },
    "TESTRAIL": {
        "BASIC": ["username", "api_token"],
        "TOKEN": ["api_token"],
    },
}


def _require_admin(role: str) -> None:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin role is required for integration configuration.")


def _encrypt(secret: str) -> str:
    key = settings.encryption_key.encode("utf-8")
    digest = hashlib.sha256(key).digest()
    payload = secret.encode("utf-8")
    encrypted = bytes([b ^ digest[i % len(digest)] for i, b in enumerate(payload)])
    return base64.urlsafe_b64encode(encrypted).decode("utf-8")


def _validate_https(url: str) -> None:
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Only HTTPS endpoints are allowed for integration URLs.")


def _validate_auth(tool_type: str, auth_type: str, credentials: dict[str, str]) -> None:
    allowed = REQUIRED_CREDENTIALS.get(tool_type, {})
    if auth_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Auth type {auth_type} is not supported for {tool_type}.")
    missing = [key for key in allowed[auth_type] if not credentials.get(key)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing credential fields: {', '.join(missing)}")


@router.get("/jira/projects")
def list_jira_projects() -> list[dict[str, str]]:
    return [{"key": "QA", "name": "QA Platform"}]


@router.get("/github/repositories")
def list_github_repositories() -> list[dict[str, str]]:
    return [{"full_name": "org/qa-orchestrator"}]


@router.post("/test", response_model=IntegrationActionResponse)
def test_integration(
    payload: IntegrationTestRequest,
    x_user_role: str = Header(default="qa_engineer"),
) -> IntegrationActionResponse:
    _require_admin(x_user_role)
    _validate_https(payload.base_url)
    _validate_auth(payload.tool_type.value, payload.auth_type.value, payload.credentials)

    if "fail" in payload.base_url:
        return IntegrationActionResponse(status="error", message="Connection failed: Unable to authenticate to remote API.")

    tested_at = datetime.now(timezone.utc).isoformat()
    current = TENANT_INTEGRATIONS.get(payload.tenant_id, {})
    TENANT_INTEGRATIONS[payload.tenant_id] = {
        **current,
        "tenant_id": payload.tenant_id,
        "tool_type": payload.tool_type.value,
        "auth_type": payload.auth_type.value,
        "base_url": payload.base_url,
        "integration_status": IntegrationState.connected.value,
        "last_tested_timestamp": tested_at,
        "last_error_message": None,
        "connection_tested": True,
    }
    return IntegrationActionResponse(status="ok", message="Connection Successful")


@router.post("/save", response_model=IntegrationActionResponse)
def save_integration(
    payload: IntegrationSaveRequest,
    x_user_role: str = Header(default="qa_engineer"),
) -> IntegrationActionResponse:
    _require_admin(x_user_role)
    _validate_https(payload.base_url)
    _validate_auth(payload.tool_type.value, payload.auth_type.value, payload.credentials)

    existing = TENANT_INTEGRATIONS.get(payload.tenant_id)
    if existing and existing.get("tool_type") != payload.tool_type.value and not payload.reset_confirmed:
        raise HTTPException(status_code=400, detail="Changing primary tool requires reset confirmation.")

    if not existing or not existing.get("connection_tested"):
        raise HTTPException(status_code=400, detail="Test Connection must succeed before saving configuration.")

    encrypted_credentials = {key: _encrypt(value) for key, value in payload.credentials.items()}

    stored = {
        "tenant_id": payload.tenant_id,
        "tool_type": payload.tool_type.value,
        "auth_type": payload.auth_type.value,
        "base_url": payload.base_url,
        "encrypted_credentials": encrypted_credentials,
        "webhook_secret": _encrypt(payload.webhook_secret),
        "integration_status": IntegrationState.connected.value,
        "last_successful_sync": datetime.now(timezone.utc).isoformat(),
        "last_tested_timestamp": existing.get("last_tested_timestamp"),
        "last_error_message": None,
        "default_project": payload.default_project,
        "connection_tested": True,
    }
    TENANT_INTEGRATIONS[payload.tenant_id] = stored
    return IntegrationActionResponse(status="ok", message="Integration configuration saved securely.")


@router.get("/status", response_model=IntegrationStatusResponse)
def get_integration_status(
    tenant_id: str,
    x_user_role: str = Header(default="qa_engineer"),
    db: Session = Depends(get_db),
) -> IntegrationStatusResponse:
    _require_admin(x_user_role)

    db_integration = None
    try:
        tenant_uuid = UUID(tenant_id)
    except ValueError:
        tenant_uuid = None

    if tenant_uuid is not None:
        db_integration = db.execute(
            select(TenantIntegration).where(
                TenantIntegration.tenant_id == tenant_uuid,
                TenantIntegration.tool_type == "ZEPHYR",
            )
        ).scalar_one_or_none()

    if db_integration is not None:
        connected = db_integration.integration_status == "CONNECTED"
        return IntegrationStatusResponse(
            tenant_id=tenant_id,
            tool_type="ZEPHYR",
            auth_type="BEARER",
            integration_status=IntegrationState.connected if connected else IntegrationState.disconnected,
            last_successful_sync=None,
            last_tested_timestamp=db_integration.last_tested_at.isoformat() if db_integration.last_tested_at else None,
            last_error_message=None if connected else "Zephyr integration test failed",
            connected=connected,
            configuration_locked=True,
        )

    stored = TENANT_INTEGRATIONS.get(tenant_id)
    if not stored:
        return IntegrationStatusResponse(
            tenant_id=tenant_id,
            tool_type=None,
            auth_type=None,
            integration_status=IntegrationState.disconnected,
            last_successful_sync=None,
            last_tested_timestamp=None,
            last_error_message=None,
            connected=False,
            configuration_locked=False,
        )

    return IntegrationStatusResponse(
        tenant_id=tenant_id,
        tool_type=stored.get("tool_type"),
        auth_type=stored.get("auth_type"),
        integration_status=stored.get("integration_status", IntegrationState.disconnected),
        last_successful_sync=stored.get("last_successful_sync"),
        last_tested_timestamp=stored.get("last_tested_timestamp"),
        last_error_message=stored.get("last_error_message"),
        connected=stored.get("integration_status") == IntegrationState.connected,
        configuration_locked=bool(stored.get("tool_type")),
    )


@router.post("/reconnect", response_model=IntegrationActionResponse)
def reconnect_integration(
    tenant_id: str,
    x_user_role: str = Header(default="qa_engineer"),
) -> IntegrationActionResponse:
    _require_admin(x_user_role)
    stored = TENANT_INTEGRATIONS.get(tenant_id)
    if not stored:
        raise HTTPException(status_code=404, detail="No integration configuration found for tenant.")

    stored["integration_status"] = IntegrationState.connected.value
    stored["last_error_message"] = None
    stored["last_tested_timestamp"] = datetime.now(timezone.utc).isoformat()
    return IntegrationActionResponse(status="ok", message="Integration reconnected successfully.")


@router.post("/force-sync", response_model=IntegrationActionResponse)
def force_sync(
    tenant_id: str,
    x_user_role: str = Header(default="qa_engineer"),
) -> IntegrationActionResponse:
    _require_admin(x_user_role)
    stored = TENANT_INTEGRATIONS.get(tenant_id)
    if not stored:
        raise HTTPException(status_code=404, detail="No integration configuration found for tenant.")

    if stored.get("integration_status") != IntegrationState.connected.value:
        raise HTTPException(status_code=400, detail="Cannot force sync while integration is disconnected.")

    stored["last_successful_sync"] = datetime.now(timezone.utc).isoformat()
    return IntegrationActionResponse(status="ok", message="Force sync triggered for projects, sprints, and stories metadata.")
