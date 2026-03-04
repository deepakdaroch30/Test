from pydantic import BaseModel, Field

from app.schemas.workspace import ToolType


class SprintDates(BaseModel):
    start: str
    end: str


class DoDComplianceStatus(BaseModel):
    test_cases_created: bool
    negative_tests_present: bool
    automation_generated_for_eligible: bool
    rtm_linked: bool
    latest_execution_passed: bool


class RiskDistribution(BaseModel):
    high: int = Field(ge=0)
    medium: int = Field(ge=0)
    low: int = Field(ge=0)


class ExecutionSummary(BaseModel):
    last_run_status: str
    total_executed: int = Field(ge=0)
    passed: int = Field(ge=0)
    failed: int = Field(ge=0)
    flaky: int = Field(ge=0)
    duration: str


class ProjectOverviewResponse(BaseModel):
    project_id: str
    project_name: str
    tool_type: ToolType
    active_sprint: str
    sprint_dates: SprintDates
    framework: str
    language: str
    integration_status: str
    integration_healthy: bool
    last_sync_time: str

    total_stories: int
    stories_with_tests_percent: int
    negative_coverage_percent: int
    automation_coverage_percent: int
    execution_pass_rate_percent: int
    requirement_quality_avg: float

    dod_compliance_status: DoDComplianceStatus
    risk_distribution: RiskDistribution
    execution_summary: ExecutionSummary
    can_view_sprint_stories: bool
