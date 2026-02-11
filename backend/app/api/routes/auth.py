from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/token")
def login(_: LoginRequest) -> dict[str, str]:
    return {
        "access_token": "replace-with-jwt-service",
        "token_type": "bearer",
    }
