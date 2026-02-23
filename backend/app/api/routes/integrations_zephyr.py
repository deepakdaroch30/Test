from __future__ import annotations

from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.token_crypto import encrypt_token
from app.models.tenant_integration import TenantIntegration
from app.services.zephyr_service import get_test_cycles, get_zephyr_integration, save_zephyr_memory_config

router = APIRouter()


class ZephyrTestRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1)
    base_url: str = Field(..., min_length=1)
    api_token: str = Field(..., min_length=1)


class ZephyrSaveRequest(ZephyrTestRequest):
    project_key: str = Field(..., min_length=1)


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
) -> dict[str, object]:
    try:
        success, error = _run_connection_test(payload.base_url, payload.api_token)
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.post("/save")
def save_zephyr_integration(
    payload: ZephyrSaveRequest,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    try:
        success, error = _run_connection_test(payload.base_url, payload.api_token)
        if not success:
            return {"success": False, "error": error}

        tenant_uuid = payload.tenant_id

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

    except Exception:
        # Fallback for environments where DB tables are not initialized yet.
        save_zephyr_memory_config(payload.tenant_id, payload.base_url, payload.api_token, payload.project_key)
        return {
            "success": True,
            "message": "Zephyr integration saved in temporary memory storage (database unavailable).",
        }


@router.get("/testcycles")
def get_zephyr_testcycles(
    tenant_id: str,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    try:
        if not tenant_id.strip():
            return {"success": False, "error": "tenant_id is required."}

        integration_result = get_zephyr_integration(db, tenant_id)
        if not integration_result.get("success"):
            raise HTTPException(status_code=404, detail="Zephyr integration not configured.")

        data = integration_result.get("data")
        if not isinstance(data, dict):
            return {"success": False, "error": "Invalid Zephyr integration state."}

        test_cycles_result = get_test_cycles(str(data.get("base_url", "")), str(data.get("api_token", "")))
        if not test_cycles_result.get("success"):
            return {"success": False, "error": str(test_cycles_result.get("error", "Unable to load Zephyr test cycles."))}

        return {"success": True, "data": test_cycles_result.get("data")}
    except HTTPException as exc:
        return {"success": False, "error": str(exc.detail)}
    except Exception:
        return {"success": False, "error": "Unexpected error while loading Zephyr test cycles."}
