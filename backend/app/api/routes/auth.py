from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    expires_at: str


@router.post("/token", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if payload.email != settings.admin_email or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_exp_minutes)
    return LoginResponse(
        access_token="demo-admin-jwt-token",
        token_type="bearer",
        role="admin",
        expires_at=expires_at.isoformat(),
    )
