from app.services.integrations.base import BaseIntegrationAdapter


class AdoAdapter(BaseIntegrationAdapter):
    def list_projects(self, tenant_id: str) -> list[dict[str, object]]:
        return [
            {
                "project_id": f"{tenant_id}-ADO-201",
                "project_name": "Core Commerce",
                "active_sprint": "Iteration 42",
                "test_coverage_percent": 79,
                "automation_coverage_percent": 64,
                "sprint_health_score": "amber",
                "framework_type": "Playwright",
                "assigned_user_ids": ["u-admin", "u-lead", "u-qa1", "u-qa2"],
            },
            {
                "project_id": f"{tenant_id}-ADO-202",
                "project_name": "Support Portal",
                "active_sprint": "Iteration 13",
                "test_coverage_percent": 88,
                "automation_coverage_percent": 68,
                "sprint_health_score": "green",
                "framework_type": "Selenium",
                "assigned_user_ids": ["u-admin", "u-lead", "u-mgr"],
            },
        ]

    def check_health(self, tenant_id: str) -> tuple[bool, str]:
        healthy = not tenant_id.endswith("-degraded")
        return healthy, "Connected to Azure DevOps" if healthy else "Azure DevOps integration disconnected"
