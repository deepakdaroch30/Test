from datetime import datetime, timezone

from fastapi import APIRouter, Header

from app.schemas.project_overview import (
    DoDComplianceStatus,
    ExecutionSummary,
    ProjectOverviewResponse,
    RiskDistribution,
    SprintDates,
)
from app.schemas.workspace import ToolType
from app.services.integrations.factory import get_integration_adapter

router = APIRouter()

TENANT_TOOL = {
    "tenant-acme": ToolType.jira,
    "tenant-contoso": ToolType.azure_devops,
}

PROJECT_LANGUAGE = {
    "101": "Python",
    "102": "JavaScript",
    "103": "Java",
    "201": "Python",
    "202": "JavaScript",
}


def _metric_band(value: int, healthy: int, warning: int) -> int:
    if value >= healthy:
        return value
    if value >= warning:
        return value
    return value


@router.get("/{project_id}/overview", response_model=ProjectOverviewResponse)
def get_project_overview(
    project_id: str,
    x_tenant_id: str = Header(default="tenant-acme"),
    x_user_role: str = Header(default="qa_lead"),
) -> ProjectOverviewResponse:
    tool_type = TENANT_TOOL.get(x_tenant_id, ToolType.jira)
    adapter = get_integration_adapter(tool_type)
    healthy, status = adapter.check_health(x_tenant_id)

    projects = adapter.list_projects(x_tenant_id)
    selected = next((project for project in projects if str(project["project_id"]) == project_id), projects[0])

    total_stories = 20 if selected["framework_type"] == "Playwright" else 16
    stories_with_tests_percent = _metric_band(88 if healthy else 55, 85, 65)
    negative_coverage_percent = _metric_band(64 if healthy else 45, 70, 50)
    automation_coverage_percent = int(selected["automation_coverage_percent"])
    execution_pass_rate_percent = _metric_band(91 if healthy else 58, 85, 70)
    requirement_quality_avg = 7.8 if healthy else 5.9

    dod = DoDComplianceStatus(
        test_cases_created=True,
        negative_tests_present=negative_coverage_percent >= 50,
        automation_generated_for_eligible=automation_coverage_percent >= 50,
        rtm_linked=healthy,
        latest_execution_passed=execution_pass_rate_percent >= 80,
    )

    risk = RiskDistribution(high=3 if healthy else 6, medium=9 if healthy else 7, low=8 if healthy else 3)

    execution = ExecutionSummary(
        last_run_status="passed" if healthy else "failed",
        total_executed=142 if healthy else 96,
        passed=129 if healthy else 56,
        failed=9 if healthy else 33,
        flaky=4 if healthy else 7,
        duration="8m 41s" if healthy else "10m 12s",
    )

    return ProjectOverviewResponse(
        project_id=str(selected["project_id"]),
        project_name=str(selected["project_name"]),
        tool_type=tool_type,
        active_sprint=str(selected["active_sprint"]),
        sprint_dates=SprintDates(start="2026-02-01", end="2026-02-14"),
        framework=str(selected["framework_type"]),
        language=PROJECT_LANGUAGE.get(project_id.split("-")[-1], "Python"),
        integration_status=status,
        integration_healthy=healthy,
        last_sync_time=datetime.now(timezone.utc).isoformat(),
        total_stories=total_stories,
        stories_with_tests_percent=stories_with_tests_percent,
        negative_coverage_percent=negative_coverage_percent,
        automation_coverage_percent=automation_coverage_percent,
        execution_pass_rate_percent=execution_pass_rate_percent,
        requirement_quality_avg=requirement_quality_avg,
        dod_compliance_status=dod,
        risk_distribution=risk,
        execution_summary=execution,
        can_view_sprint_stories=x_user_role in {"admin", "qa_lead", "qa_engineer", "manager"} and healthy,
    )
