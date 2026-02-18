from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.token_crypto import encrypt_token
from app.models.tenant_integration import TenantIntegration

router = APIRouter()


class ZephyrTestRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1)
    base_url: str = Field(..., min_length=1)
    api_token: str = Field(..., min_length=1)


class ZephyrSaveRequest(ZephyrTestRequest):
    project_key: str = Field(..., min_length=1)


def require_admin_role(x_user_role: str = Header(default="qa_engineer")) -> str:
    if x_user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role is required for Zephyr integration configuration.",
        )
    return x_user_role


def _run_connection_test(base_url: str, api_token: str) -> tuple[bool, str | None]:
    if not base_url.startswith("https://"):
        return False, "Only HTTPS base URLs are allowed."

    test_url = f"{base_url.rstrip('/')}/testcycles"
    try:
        response = requests.get(
            test_url,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        return False, f"Failed to connect to Zephyr API at '{test_url}': {exc}"

    if response.status_code == 200:
        return True, None

    return False, response.text or f"Unexpected response code: {response.status_code}"


@router.post("/test")
def test_zephyr_connection(
    payload: ZephyrTestRequest,
    _: str = Depends(require_admin_role),
) -> dict[str, object]:
    success, error = _run_connection_test(payload.base_url, payload.api_token)
    if success:
        return {"success": True}
    return {"success": False, "error": error}


@router.post("/save")
def save_zephyr_integration(
    payload: ZephyrSaveRequest,
    _: str = Depends(require_admin_role),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    success, error = _run_connection_test(payload.base_url, payload.api_token)
    if not success:
        raise HTTPException(status_code=400, detail=error or "Zephyr connection test failed.")

    try:
        tenant_uuid = UUID(payload.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="tenant_id must be a valid UUID.") from exc

    encrypted_token = encrypt_token(payload.api_token)
    now = datetime.now(timezone.utc)

    statement = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_uuid,
        TenantIntegration.tool_type == "ZEPHYR",
    )
    integration = db.execute(statement).scalar_one_or_none()

    if integration is None:
        integration = TenantIntegration(
            tenant_id=tenant_uuid,
            tool_type="ZEPHYR",
            base_url=payload.base_url,
            encrypted_api_token=encrypted_token,
            default_project_key=payload.project_key,
            integration_status="CONNECTED",
            last_tested_at=now,
        )
        db.add(integration)
    else:
        integration.base_url = payload.base_url
        integration.encrypted_api_token = encrypted_token
        integration.default_project_key = payload.project_key
        integration.integration_status = "CONNECTED"
        integration.last_tested_at = now

    db.commit()
    return {"success": True, "message": "Zephyr integration saved."}
