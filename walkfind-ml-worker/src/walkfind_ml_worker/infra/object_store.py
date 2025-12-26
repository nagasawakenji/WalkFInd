from typing import Protocol

class ObjectStore(Protocol):
    def get_bytes(self, key: str) -> bytes:
        ...