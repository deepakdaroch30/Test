from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.token_crypto import encrypt_token
from app.models.tenant_integration import TenantIntegration

router = APIRouter()


class ZephyrIntegrationSaveRequest(BaseModel):
    base_url: str = Field(..., min_length=1)
    api_token: str = Field(..., min_length=1)
    project_key: str = Field(..., min_length=1)


def require_admin_role(x_user_role: str = Header(default="qa_engineer")) -> str:
    if x_user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role is required for Zephyr integration configuration.",
        )
    return x_user_role


def get_db(request: Request) -> Generator[Session, None, None]:
    db: Session | None = getattr(request.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database session is not available.")
    yield db


@router.post("/save")
def save_zephyr_integration(
    payload: ZephyrIntegrationSaveRequest,
    _: str = Depends(require_admin_role),
    x_tenant_id: str = Header(...),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not payload.base_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Only HTTPS base URLs are allowed.")

    test_url = f"{payload.base_url.rstrip('/')}/testcycles"
    try:
        test_response = requests.get(
            test_url,
            headers={
                "Authorization": f"Bearer {payload.api_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Zephyr API at '{test_url}'.",
        ) from exc

    if test_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=(
                "Zephyr connection test failed. "
                f"Expected 200 from /testcycles, got {test_response.status_code}."
            ),
        )

    try:
        tenant_uuid = UUID(x_tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="x-tenant-id must be a valid UUID.") from exc

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

    return {"status": "ok", "message": "Zephyr integration configuration saved successfully."}
