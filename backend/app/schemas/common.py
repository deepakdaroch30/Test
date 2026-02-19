from enum import Enum

from pydantic import BaseModel, Field


class Role(str, Enum):
    admin = "admin"
    qa_lead = "qa_lead"
    qa_engineer = "qa_engineer"
    automation_engineer = "automation_engineer"
    manager = "manager"


class Message(BaseModel):
    message: str = Field(..., examples=["ok"])
