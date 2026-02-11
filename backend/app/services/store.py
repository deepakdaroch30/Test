from collections import defaultdict
from typing import Any
from uuid import uuid4


class InMemoryStore:
    def __init__(self) -> None:
        self.data: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def add(self, bucket: str, payload: dict[str, Any]) -> dict[str, Any]:
        record = {"id": str(uuid4()), **payload}
        self.data[bucket].append(record)
        return record

    def list(self, bucket: str) -> list[dict[str, Any]]:
        return self.data[bucket]


store = InMemoryStore()
