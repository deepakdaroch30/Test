from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class TestCaseRequest(BaseModel):
    story_id: str
    gherkin: bool = False


@router.post("/generate")
def generate_test_cases(payload: TestCaseRequest) -> dict[str, object]:
    base_case = {
        "precondition": "User is authenticated",
        "steps": ["Open feature page", "Submit valid data"],
        "expected_result": "Action completes successfully",
        "risk_level": "medium",
        "automation_eligible": True,
        "type": "positive",
    }
    negative_case = {
        "precondition": "User is authenticated",
        "steps": ["Submit invalid data"],
        "expected_result": "Validation error is shown",
        "risk_level": "high",
        "automation_eligible": True,
        "type": "negative",
    }
    if payload.gherkin:
        base_case["steps"] = ["Given authenticated user", "When valid data is submitted", "Then action succeeds"]
        negative_case["steps"] = ["Given authenticated user", "When invalid data is submitted", "Then validation error is shown"]
    return {"story_id": payload.story_id, "test_cases": [base_case, negative_case]}
