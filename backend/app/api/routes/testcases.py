from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class TestCaseRequest(BaseModel):
    story_id: str
    gherkin: bool = False


class TestCaseDraft(BaseModel):
    story_id: str
    precondition: str
    steps: list[str]
    expected_result: str
    risk_level: str
    automation_eligible: bool = True
    type: str


class PublishTestCasesRequest(BaseModel):
    tenant_id: str
    project_id: str
    tool_type: str
    release_name: str
    test_cases: list[TestCaseDraft]


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


@router.post("/publish")
def publish_test_cases(payload: PublishTestCasesRequest) -> dict[str, object]:
    published = len(payload.test_cases)
    tool_label = "Jira/Zephyr" if payload.tool_type.upper() == "ZEPHYR" else payload.tool_type

    return {
        "success": True,
        "message": f"Published {published} test case(s) to {tool_label} for release '{payload.release_name}'.",
        "published_count": published,
        "tool_type": payload.tool_type.upper(),
        "project_id": payload.project_id,
    }
