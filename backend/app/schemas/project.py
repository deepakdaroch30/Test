from enum import Enum

from pydantic import BaseModel, Field


class TestCaseFormat(str, Enum):
    structured = "structured"
    gherkin = "gherkin"


class Framework(str, Enum):
    playwright = "playwright"
    selenium = "selenium"


class Language(str, Enum):
    javascript = "javascript"
    python = "python"
    java = "java"


class ProjectInitRequest(BaseModel):
    name: str
    jira_project_key: str
    test_case_format: TestCaseFormat
    automation_framework: Framework = Framework.playwright
    programming_language: Language
    github_repository: str
    branching_strategy: str = Field(..., examples=["trunk", "gitflow"])


class ProjectInitResponse(ProjectInitRequest):
    id: str
    config_locked: bool = True
