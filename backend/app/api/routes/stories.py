from fastapi import APIRouter
from pydantic import BaseModel

from app.services.store import store

router = APIRouter()


class Story(BaseModel):
    project_id: str
    key: str
    title: str
    description: str
    acceptance_criteria: list[str]
    priority: str
    story_points: int | None = None


@router.post("")
def ingest_story(payload: Story) -> dict[str, str]:
    return store.add("stories", payload.model_dump())


@router.get("")
def list_stories() -> list[dict[str, str]]:
    return store.list("stories")
