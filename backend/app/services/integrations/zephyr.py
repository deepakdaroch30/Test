from __future__ import annotations

import uuid
from typing import Any

import requests
from requests import Response, Session as RequestsSession
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.token_crypto import decrypt_token
from app.models.tenant_integration import TenantIntegration


class ZephyrAdapter:
    def __init__(self, tenant_id: str, db_session: Session):
        self.tenant_id = tenant_id
        self.db_session = db_session
        self.http: RequestsSession = requests.Session()

        integration = self._get_integration()
        self.base_url = integration.base_url.rstrip("/")

        try:
            token = decrypt_token(integration.encrypted_api_token)
        except Exception as exc:
            raise RuntimeError(
                f"Zephyr integration token could not be decrypted for tenant '{tenant_id}'."
            ) from exc

        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _get_integration(self) -> TenantIntegration:
        try:
            tenant_uuid = uuid.UUID(self.tenant_id)
        except ValueError as exc:
            raise RuntimeError(f"Invalid tenant_id '{self.tenant_id}' for Zephyr integration lookup.") from exc

        statement = select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_uuid,
            TenantIntegration.tool_type == "ZEPHYR",
        )
        integration = self.db_session.execute(statement).scalar_one_or_none()
        if integration is None:
            raise RuntimeError(
                f"Zephyr integration is not configured for tenant '{self.tenant_id}'."
            )
        return integration

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = self.http.request(
                method=method,
                url=url,
                headers=self.headers,
                json=payload,
                timeout=30,
            )
        except requests.RequestException as exc:
            raise RuntimeError(f"Failed to reach Zephyr API endpoint '{url}'.") from exc

        self._raise_for_status(response)
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def _raise_for_status(self, response: Response) -> None:
        if response.ok:
            return
        details = response.text.strip() or "No response body"
        raise RuntimeError(
            f"Zephyr API request failed ({response.status_code}) for '{response.request.method} {response.url}': {details}"
        )

    def get_test_cycles(self) -> list[dict[str, Any]]:
        payload = self._request("GET", "/testcycles")
        if isinstance(payload, dict) and "values" in payload:
            return payload["values"]
        if isinstance(payload, list):
            return payload
        return []

    def create_test_cycle(self, project_key: str, name: str, description: str) -> dict[str, Any]:
        return self._request(
            "POST",
            "/testcycles",
            {
                "projectKey": project_key,
                "name": name,
                "description": description,
            },
        )

    def create_test_execution(
        self,
        project_key: str,
        test_case_key: str,
        test_cycle_key: str,
        status_name: str,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/testexecutions",
            {
                "projectKey": project_key,
                "testCaseKey": test_case_key,
                "testCycleKey": test_cycle_key,
                "statusName": status_name,
            },
        )
