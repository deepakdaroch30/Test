from app.services.integrations.base import BaseIntegrationAdapter


class JiraAdapter(BaseIntegrationAdapter):
    def list_projects(self, tenant_id: str) -> list[dict[str, object]]:
        return [
            {
                "project_id": f"{tenant_id}-JIRA-101",
                "project_name": "Payments QA",
                "active_sprint": "Sprint 24",
                "test_coverage_percent": 84,
                "automation_coverage_percent": 58,
                "sprint_health_score": "amber",
                "framework_type": "Playwright",
                "assigned_user_ids": ["u-admin", "u-lead", "u-qa1", "u-mgr"],
            },
            {
                "project_id": f"{tenant_id}-JIRA-102",
                "project_name": "Identity Platform",
                "active_sprint": "Sprint 19",
                "test_coverage_percent": 91,
                "automation_coverage_percent": 72,
                "sprint_health_score": "green",
                "framework_type": "Playwright",
                "assigned_user_ids": ["u-admin", "u-lead", "u-qa2"],
            },
            {
                "project_id": f"{tenant_id}-JIRA-103",
                "project_name": "Billing Ops",
                "active_sprint": "Sprint 11",
                "test_coverage_percent": 62,
                "automation_coverage_percent": 35,
                "sprint_health_score": "red",
                "framework_type": "Selenium",
                "assigned_user_ids": ["u-admin", "u-lead", "u-mgr"],
            },
        ]

    def check_health(self, tenant_id: str) -> tuple[bool, str]:
        healthy = not tenant_id.endswith("-degraded")
        return healthy, "Connected to Jira" if healthy else "Jira integration disconnected"
