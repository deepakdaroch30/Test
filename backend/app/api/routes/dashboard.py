from fastapi import APIRouter

router = APIRouter()


@router.get("/sprint/{sprint_id}")
def sprint_dashboard(sprint_id: str) -> dict[str, object]:
    return {
        "sprint_id": sprint_id,
        "total_stories": 20,
        "requirement_quality_score": 7.8,
        "test_coverage": 84,
        "negative_coverage": 64,
        "automation_coverage": 58,
        "execution_pass_rate": 91,
        "defect_leakage": 4,
        "risk_heatmap": {"high": 3, "medium": 9, "low": 8},
        "sprint_quality_index": 79.2,
    }
