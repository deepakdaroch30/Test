from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class DoDInput(BaseModel):
    story_id: str
    has_test_cases: bool
    has_negative_case: bool
    automation_complete_if_eligible: bool
    rtm_linked: bool
    latest_execution_passed: bool


@router.post("/validate")
def validate_dod(payload: DoDInput) -> dict[str, object]:
    checks = {
        "test_cases_exist": payload.has_test_cases,
        "negative_test_exists": payload.has_negative_case,
        "automation_complete": payload.automation_complete_if_eligible,
        "rtm_linked": payload.rtm_linked,
        "latest_execution_passed": payload.latest_execution_passed,
    }
    return {"story_id": payload.story_id, "compliant": all(checks.values()), "checks": checks}
