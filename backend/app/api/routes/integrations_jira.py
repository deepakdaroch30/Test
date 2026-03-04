from __future__ import annotations

import base64
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.token_crypto import encrypt_token
from app.models.tenant_integration import TenantIntegration
from app.services.jira_service import get_jira_integration, get_projects

router = APIRouter()


class JiraIntegrationRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1)
    base_url: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    api_token: str = Field(..., min_length=1)


def _run_jira_connection_test(base_url: str, email: str, api_token: str) -> tuple[bool, str | None]:
    if not base_url.startswith("https://"):
        return False, "Only HTTPS base URLs are allowed."

    test_url = f"{base_url.rstrip('/')}/rest/api/3/project"
    auth_token = base64.b64encode(f"{email}:{api_token}".encode("utf-8")).decode("utf-8")

    try:
        response = requests.get(
            test_url,
            headers={
                "Authorization": f"Basic {auth_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException:
        return False, "Failed to connect to Jira API."

    if response.status_code == 200:
        return True, None

    return False, f"Jira API request failed with status code {response.status_code}."


@router.post("/test")
def test_jira_connection(payload: JiraIntegrationRequest) -> dict[str, object]:
    try:
        success, error = _run_jira_connection_test(payload.base_url, payload.email, payload.api_token)
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.post("/save")
def save_jira_integration(
    payload: JiraIntegrationRequest,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    try:
        success, error = _run_jira_connection_test(payload.base_url, payload.email, payload.api_token)
        if not success:
            return {"success": False, "error": error}

        encrypted_token = encrypt_token(payload.api_token)
        now = datetime.now(timezone.utc)

        statement = select(TenantIntegration).where(
            TenantIntegration.tenant_id == payload.tenant_id,
            TenantIntegration.tool_type == "JIRA",
        )
        integration = db.execute(statement).scalar_one_or_none()

        if integration is None:
            integration = TenantIntegration(
                tenant_id=payload.tenant_id,
                tool_type="JIRA",
                base_url=payload.base_url,
                encrypted_api_token=encrypted_token,
                default_project_key=payload.email,
                integration_status="CONNECTED",
                last_tested_at=now,
            )
            db.add(integration)
        else:
            integration.base_url = payload.base_url
            integration.encrypted_api_token = encrypted_token
            integration.default_project_key = payload.email
            integration.integration_status = "CONNECTED"
            integration.last_tested_at = now

        db.commit()
        return {"success": True, "message": "Jira integration saved."}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.get("/projects")
def get_jira_projects(
    tenant_id: str,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    try:
        if not tenant_id.strip():
            return {"success": False, "error": "tenant_id is required."}

        integration_result = get_jira_integration(db, tenant_id)
        if not integration_result.get("success"):
            return {"success": False, "error": "Jira integration not configured."}

        data = integration_result.get("data")
        if not isinstance(data, dict):
            return {"success": False, "error": "Invalid Jira integration state."}

        projects_result = get_projects(
            str(data.get("base_url", "")),
            str(data.get("email", "")),
            str(data.get("api_token", "")),
        )
        if not projects_result.get("success"):
            return {"success": False, "error": str(projects_result.get("error", "Unable to load Jira projects."))}

        return {"success": True, "data": projects_result.get("data", [])}
    except Exception as exc:
        return {"success": False, "error": f"Unexpected error: {exc}"}
