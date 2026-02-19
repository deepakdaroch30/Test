from fastapi import APIRouter

from app.schemas.project import ProjectInitRequest, ProjectInitResponse
from app.services.store import store

router = APIRouter()


@router.post("", response_model=ProjectInitResponse)
def create_project(payload: ProjectInitRequest) -> ProjectInitResponse:
    record = store.add("projects", payload.model_dump())
    return ProjectInitResponse(**record)


@router.get("")
def list_projects() -> list[dict[str, str]]:
    return store.list("projects")
