from __future__ import annotations

from pathlib import Path

from .object_store import ObjectStore


class LocalObjectStore(ObjectStore):
    """Local filesystem-based object store.

    `base_dir` can be absolute or relative.
    - If `base_dir` is blank/None, it defaults to `walkfind-web/local-storage` resolved from the current working directory,
      matching Java's `Paths.get("walkfind-web", "local-storage").toAbsolutePath()` style.

    `key` is treated as a relative path under `base_dir`.
    """

    def __init__(self, base_dir: str | None = None):
        if base_dir is None or str(base_dir).strip() == "":
            # Default to the sibling repository path:
            #   <monorepo>/walkfind-web/local-storage
            # when running from within <monorepo>/walkfind-ml-worker.
            # This avoids depending on the current working directory.
            ml_root = Path(__file__).resolve().parents[3]  # .../walkfind-ml-worker
            base_dir = str(ml_root.parent / "walkfind-web" / "local-storage")

        # Resolve relative paths against the current working directory (if a relative base_dir was provided)
        self.base: Path = Path(base_dir).expanduser().resolve()

        if not self.base.exists() or not self.base.is_dir():
            raise FileNotFoundError(f"LOCAL_STORAGE_DIR not found or not a directory: {self.base}")

    def get_bytes(self, key: str) -> bytes:
        if key is None:
            raise ValueError("key is required")

        key = str(key)

        # Normalize path separators to avoid Windows-style bypasses
        key = key.replace("\\\\", "/")

        # Disallow absolute paths and traversal
        if key.startswith("/") or ".." in key.split("/"):
            raise ValueError("invalid key")

        p = (self.base / key).resolve()

        # Safer than string prefix checks
        try:
            p.relative_to(self.base)
        except ValueError:
            raise ValueError("invalid key path")

        return p.read_bytes()