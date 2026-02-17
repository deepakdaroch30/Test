from abc import ABC, abstractmethod
from typing import Any


class BaseIntegrationAdapter(ABC):
    @abstractmethod
    def list_projects(self, tenant_id: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def check_health(self, tenant_id: str) -> tuple[bool, str]:
        raise NotImplementedError
