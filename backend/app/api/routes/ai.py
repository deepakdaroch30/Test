from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RequirementInput(BaseModel):
    story_id: str
    description: str
    acceptance_criteria: list[str]


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
