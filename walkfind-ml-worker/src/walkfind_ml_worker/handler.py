import json
import os
import sys
import time
import logging
from typing import Any, Dict, Optional

from .config import Config
from .job import EmbeddingJob
from .infra.db import Db
from .infra.s3_object_store import S3ObjectStore
from .infra.local_object_store import LocalObjectStore
from .embed.openclip_embedder import OpenClipEmbedder
from .service.embedding_service import EmbeddingService

# =====================================================
# Process-level singletons (Lambda container reuse friendly)
# =====================================================
_cfg = Config()
_embedder = OpenClipEmbedder(_cfg.openclip_model, _cfg.openclip_pretrained)

# Prefer Secrets Manager path if Db.from_config exists; otherwise fallback to plain env/config values.
try:
    _db = Db.from_config(_cfg)  # type: ignore[attr-defined]
except AttributeError:
    _db = Db(
        _cfg.db_host,
        _cfg.db_port,
        _cfg.db_name,
        _cfg.db_user,
        _cfg.db_password,
        _cfg.db_sslmode,
    )

# Cache services per store instance (local: LocalObjectStore, prod: S3 store)
_SVC_CACHE: Dict[int, EmbeddingService] = {}

_logger = logging.getLogger(__name__)

def _setup_logging() -> None:
    """Configure logging so it shows up in the terminal.

    - Uses stdout so `docker logs` and local terminal both show logs.
    - Level can be controlled via `LOG_LEVEL` env (DEBUG/INFO/WARNING/ERROR).

    NOTE: In AWS Lambda, logs to stdout/stderr are collected by CloudWatch.
    """
    level_name = (os.getenv("LOG_LEVEL") or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    # Always attach a StreamHandler to stdout.
    root = logging.getLogger()

    # If basicConfig was already called elsewhere, don't duplicate handlers.
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s %(levelname)s %(name)s: %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        root.addHandler(handler)

    root.setLevel(level)

    # Make sure our module logger also emits at the chosen level.
    _logger.setLevel(level)
    _logger.propagate = True

    # Optional: reduce noisy libs
    logging.getLogger("botocore").setLevel(max(level, logging.WARNING))
    logging.getLogger("boto3").setLevel(max(level, logging.WARNING))


# Configure at import time so `python -m walkfind_ml_worker.main` shows logs.
_setup_logging()

_logger.info("[worker] logging initialized level=%s", (os.getenv("LOG_LEVEL") or "INFO").upper())


def _new_service(store: Any) -> EmbeddingService:
    """Create an EmbeddingService, tolerant to constructor signature differences."""
    # Your project may name the dependency `s3` or `store`.
    try:
        return EmbeddingService(s3=store, db=_db, embedder=_embedder)
    except TypeError:
        try:
            return EmbeddingService(store=store, db=_db, embedder=_embedder)
        except TypeError:
            # Positional fallback
            return EmbeddingService(store, _db, _embedder)


def get_service(store: Any) -> EmbeddingService:
    """Return a cached EmbeddingService bound to the given object store."""
    sid = id(store)
    svc = _SVC_CACHE.get(sid)
    if svc is None:
        svc = _new_service(store)
        _SVC_CACHE[sid] = svc
    return svc


def _parse_payload(obj: Any) -> Optional[Dict[str, Any]]:
    """Parse a payload from dict/JSON-string; return None for empty."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj
    if isinstance(obj, str):
        s = obj.strip()
        if not s:
            return None
        return json.loads(s)
    if isinstance(obj, (bytes, bytearray)):
        s = obj.decode("utf-8").strip()
        if not s:
            return None
        return json.loads(s)
    return None


def handle_message(payload: Dict[str, Any], *, store: Any, raw_message: Optional[Any] = None) -> bool:
    """Process a single queue payload.

    Return:
      True  -> delete/ack the message
      False -> keep the message (will be retried after visibility timeout)
    """
    try:
        t0 = time.time()
        _logger.info("[worker] start payload=%s", payload)
        _logger.debug("[worker] payload keys=%s", sorted(list(payload.keys())) if isinstance(payload, dict) else type(payload))
        # Preferred: EmbeddingJob.from_dict
        if hasattr(EmbeddingJob, "from_dict"):
            job = EmbeddingJob.from_dict(payload)  # type: ignore[attr-defined]
        else:
            job = EmbeddingJob(**payload)  # type: ignore[arg-type]

        svc = get_service(store)
        svc.run_once(job)
        dt_ms = int((time.time() - t0) * 1000)
        # Best-effort job fields (job may be dataclass or similar)
        _logger.info(
            "[worker] success contestId=%s photoType=%s photoId=%s modelVersion=%s storageKey=%s elapsedMs=%s",
            getattr(job, "contestId", None),
            getattr(job, "photoType", None),
            getattr(job, "photoId", None),
            getattr(job, "modelVersion", None),
            getattr(job, "storageKey", None),
            dt_ms,
        )
        return True

    except Exception as e:
        dt_ms = int((time.time() - t0) * 1000) if "t0" in locals() else None
        _logger.exception("[worker] failed elapsedMs=%s payload=%s", dt_ms, payload)
        return False


def handler(event, context):
    """AWS Lambda entrypoint.

    Supported event shapes:
    - SQS trigger: event["Records"][].body contains job JSON
    - Direct invoke: event itself is a job dict or JSON string

    NOTE:
    - Production is assumed to use S3.
    - Local polling should call `handle_message(..., store=...)` from main.py.
    """

    # Build store once per process (Lambda container reuse friendly)
    # - Local: read from LOCAL_STORAGE_DIR (or default walkfind-web/local-storage)
    # - Prod:  S3_BUCKET + AWS_REGION
    global _STORE  # type: ignore[name-defined]

    try:
        _STORE
    except NameError:
        _STORE = None  # type: ignore[assignment]

    if _STORE is None:
        provider = (os.getenv("STORAGE_PROVIDER") or "s3").strip().lower()
        _logger.info("[worker] storage provider=%s", provider)

        if provider == "local":
            base_dir = os.getenv("LOCAL_STORAGE_DIR")
            _STORE = LocalObjectStore(base_dir)
        else:
            bucket = os.getenv("S3_BUCKET") or os.getenv("S3_BUCKET_NAME")
            if not bucket:
                raise RuntimeError("S3_BUCKET (or S3_BUCKET_NAME) is required when STORAGE_PROVIDER is not 'local'")
            region = os.getenv("AWS_REGION") or getattr(_cfg, "aws_region", None) or "ap-northeast-1"
            _STORE = S3ObjectStore(bucket=bucket, region=region)

    store = _STORE

    
    _logger.info(
        "[worker] lambda handler invoked eventType=%s",
        "SQS" if (isinstance(event, dict) and "Records" in event) else "DIRECT",
    )

    # SQS trigger
    if isinstance(event, dict) and "Records" in event:
        received = 0
        processed = 0
        _logger.info("[worker] sqs batch start records=%s", len(event.get("Records", []) or []))

        for r in event.get("Records", []):
            received += 1
            payload = _parse_payload(r.get("body"))
            if payload is None:
                # Skip empty bodies but do not fail the entire batch.
                _logger.warning("[worker] skip empty body")
                continue

            if handle_message(payload, store=store, raw_message=r):
                processed += 1

        _logger.info("[worker] sqs batch done received=%s processed=%s", received, processed)
        return {"ok": True, "received": received, "processed": processed}

    # Direct invoke
    payload = _parse_payload(event)
    if payload is None or not isinstance(payload, dict):
        raise ValueError("Direct invoke event must be a dict or JSON string")

    _logger.info("[worker] direct invoke start")
    handle_message(payload, store=store, raw_message=None)
    _logger.info("[worker] direct invoke done")
    return {"ok": True, "processed": 1}