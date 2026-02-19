from __future__ import annotations

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.token_crypto import decrypt_token
from app.models.tenant_integration import TenantIntegration


def get_zephyr_integration(db: Session, tenant_id: str) -> dict[str, object]:
    statement = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.tool_type == "ZEPHYR",
    )
    integration = db.execute(statement).scalar_one_or_none()

    if integration is None:
        return {"success": False, "error": "Zephyr integration not configured."}

    try:
        api_token = decrypt_token(integration.encrypted_api_token)
    except Exception:
        return {"success": False, "error": "Unable to decrypt stored Zephyr API token."}

    return {
        "success": True,
        "data": {
            "base_url": integration.base_url,
            "api_token": api_token,
        },
    }


def get_test_cycles(base_url: str, api_token: str) -> dict[str, object]:
    try:
        if not base_url.startswith("https://"):
            return {"success": False, "error": "Only HTTPS base URLs are allowed."}

        test_url = f"{base_url.rstrip('/')}/testcycles"
        print("Calling Zephyr API at:", test_url)
        print("Using token length:", len(api_token))

        try:
            response = requests.get(
                test_url,
                headers={
                    "Authorization": f"Bearer {api_token}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
        except requests.RequestException:
            return {"success": False, "error": "Failed to connect to Zephyr API."}

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Zephyr API request failed with status code {response.status_code}.",
            }

        try:
            payload = response.json()
        except ValueError:
            return {"success": False, "error": "Zephyr API returned invalid JSON."}

        return {"success": True, "data": payload}
    except Exception as e:
        print("Zephyr get_test_cycles exception:", str(e))
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
        }
