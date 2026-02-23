from __future__ import annotations

import base64

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.token_crypto import decrypt_token
from app.models.tenant_integration import TenantIntegration


def get_jira_integration(db: Session, tenant_id: str) -> dict[str, object]:
    try:
        statement = select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_id,
            TenantIntegration.tool_type == "JIRA",
        )
        integration = db.execute(statement).scalar_one_or_none()
    except Exception as exc:
        return {"success": False, "error": f"Failed to read Jira integration: {exc}"}

    if integration is None:
        return {"success": False, "error": "Jira integration not configured."}

    try:
        api_token = decrypt_token(integration.encrypted_api_token)
    except Exception:
        return {"success": False, "error": "Unable to decrypt stored Jira API token."}

    email = integration.default_project_key or ""

    return {
        "success": True,
        "data": {
            "base_url": integration.base_url,
            "email": email,
            "api_token": api_token,
        },
    }


def get_projects(base_url: str, email: str, api_token: str) -> dict[str, object]:
    if not base_url.startswith("https://"):
        return {"success": False, "error": "Only HTTPS base URLs are allowed."}
    if not email:
        return {"success": False, "error": "Jira email is required."}

    projects_url = f"{base_url.rstrip('/')}/rest/api/3/project"
    auth_token = base64.b64encode(f"{email}:{api_token}".encode("utf-8")).decode("utf-8")

    try:
        response = requests.get(
            projects_url,
            headers={
                "Authorization": f"Basic {auth_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
    except requests.RequestException:
        return {"success": False, "error": "Failed to connect to Jira API."}

    if response.status_code != 200:
        return {
            "success": False,
            "error": f"Jira API request failed with status code {response.status_code}.",
        }

    try:
        payload = response.json()
    except ValueError:
        return {"success": False, "error": "Jira API returned invalid JSON."}

    if not isinstance(payload, list):
        return {"success": False, "error": "Unexpected Jira projects response format."}

    projects = [
        {
            "id": str(item.get("id", "")),
            "key": str(item.get("key", "")),
            "name": str(item.get("name", "")),
        }
        for item in payload
    ]

    return {"success": True, "data": projects}
