from fastapi import APIRouter

router = APIRouter()


@router.get("/coverage/{story_id}")
def rtm_coverage(story_id: str) -> dict[str, object]:
    return {
        "story_id": story_id,
        "story_coverage": 100,
        "negative_coverage": 50,
        "automation_coverage": 50,
        "rtm_completeness": 75,
    }
