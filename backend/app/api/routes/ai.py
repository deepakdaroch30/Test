from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class RequirementInput(BaseModel):
    story_id: str
    description: str
    acceptance_criteria: list[str]


class BacklogConversionRequest(BaseModel):
    tenant_id: str
    project_id: str
    source_text: str = Field(..., description="Raw requirement notes or meeting transcript")


@router.post("/requirement-analyzer")
def analyze_requirement(payload: RequirementInput) -> dict[str, object]:
    ambiguity_hits = 1 if "etc" in payload.description.lower() else 0
    negative_coverage_gap = max(0, 2 - len([ac for ac in payload.acceptance_criteria if "not" in ac.lower()]))
    score = max(1, 10 - (ambiguity_hits * 2 + negative_coverage_gap))
    return {
        "story_id": payload.story_id,
        "testability_score": score,
        "ambiguities": ["Replace vague phrases with measurable behavior"] if ambiguity_hits else [],
        "missing_edge_cases": ["Boundary values are not explicitly defined"],
        "missing_negative_scenarios": ["Permission denied / invalid input behavior not specified"],
        "suggestions": [
            "Add explicit acceptance criteria for invalid inputs",
            "Specify response expectations for empty and maximum values",
        ],
    }


@router.post("/requirements-to-backlog")
def requirements_to_backlog(payload: BacklogConversionRequest) -> dict[str, object]:
    raw_lines = [line.strip(" -\t") for line in payload.source_text.splitlines() if line.strip()]

    if not raw_lines:
        return {
            "tenant_id": payload.tenant_id,
            "project_id": payload.project_id,
            "user_stories": [],
            "product_backlog_items": [],
            "summary": "No usable requirement statements found.",
        }

    statements = raw_lines[:10]
    user_stories = []
    backlog_items = []

    for index, statement in enumerate(statements, start=1):
        cleaned = statement.rstrip(".")
        story_id = f"US-{index:03d}"
        pbi_id = f"PBI-{index:03d}"

        story_text = f"As a business user, I want {cleaned.lower()} so that expected value is delivered."
        user_stories.append(
            {
                "story_id": story_id,
                "title": cleaned[:90],
                "story": story_text,
                "priority": "High" if index <= 3 else "Medium",
                "acceptance_criteria": [
                    f"Given {cleaned.lower()} is requested",
                    "When the flow is executed",
                    "Then expected output is available and auditable",
                ],
            }
        )

        backlog_items.append(
            {
                "item_id": pbi_id,
                "type": "Feature" if index <= 5 else "Task",
                "description": cleaned,
                "mapped_story_id": story_id,
                "estimate_points": 8 if index <= 3 else 5,
            }
        )

    return {
        "tenant_id": payload.tenant_id,
        "project_id": payload.project_id,
        "user_stories": user_stories,
        "product_backlog_items": backlog_items,
        "summary": f"Generated {len(user_stories)} user stories and {len(backlog_items)} backlog items.",
    }
