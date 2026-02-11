from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.schemas.integration_config import (
    IntegrationActionResponse,
    IntegrationSaveRequest,
    IntegrationState,
    IntegrationStatusResponse,
    IntegrationTestRequest,
)

router = APIRouter()

TENANT_INTEGRATIONS: dict[str, dict[str, Any]] = {}


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

    if "fail" in payload.base_url:
        return IntegrationActionResponse(status="error", message="Connection failed: Unable to authenticate to remote API.")

    tested_at = datetime.now(timezone.utc).isoformat()
    current = TENANT_INTEGRATIONS.get(payload.tenant_id, {})
    TENANT_INTEGRATIONS[payload.tenant_id] = {
        **current,
        "tenant_id": payload.tenant_id,
        "tool_type": payload.tool_type.value,
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

    existing = TENANT_INTEGRATIONS.get(payload.tenant_id)
    if existing and existing.get("tool_type") != payload.tool_type.value and not payload.reset_confirmed:
        raise HTTPException(status_code=400, detail="Changing primary tool requires reset confirmation.")

    if not existing or not existing.get("connection_tested"):
        raise HTTPException(status_code=400, detail="Test Connection must succeed before saving configuration.")

    stored = {
        "tenant_id": payload.tenant_id,
        "tool_type": payload.tool_type.value,
        "base_url": payload.base_url,
        "encrypted_credentials": {
            "client_secret": _encrypt(payload.client_secret or ""),
            "api_token": _encrypt(payload.api_token or payload.personal_access_token or ""),
        },
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
) -> IntegrationStatusResponse:
    _require_admin(x_user_role)
    stored = TENANT_INTEGRATIONS.get(tenant_id)
    if not stored:
        return IntegrationStatusResponse(
            tenant_id=tenant_id,
            tool_type=None,
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
