import os
from typing import Any

from walkfind_ml_worker.infra.local_object_store import LocalObjectStore
from walkfind_ml_worker.infra.s3_object_store import S3ObjectStore
from walkfind_ml_worker.infra.sqs_poller import SqsPoller
from walkfind_ml_worker.handler import handle_message


def build_store():
    """Build an ObjectStore implementation based on env.

    STORAGE_PROVIDER:
      - "local" (default): reads from LOCAL_STORAGE_DIR (optional)
      - "s3": reads from S3_BUCKET (required)

    Notes:
    - LocalObjectStore already has a safe default base_dir if LOCAL_STORAGE_DIR is missing.
    - Lambda provides AWS_REGION implicitly; do NOT try to set it as a Lambda env var.
    """
    provider = (os.getenv("STORAGE_PROVIDER", "local") or "local").lower()

    if provider == "s3":
        bucket = os.getenv("S3_BUCKET") or os.getenv("S3_BUCKET_NAME")
        if not bucket:
            raise RuntimeError("S3_BUCKET (or S3_BUCKET_NAME) is required when STORAGE_PROVIDER=s3")
        return S3ObjectStore(bucket=bucket, region=os.getenv("AWS_REGION"))

    # local
    return LocalObjectStore(base_dir=os.getenv("LOCAL_STORAGE_DIR"))


def main() -> None:
    """Local entrypoint.

    This process continuously polls ElasticMQ and dispatches each message to `handler`.

    - In production (Lambda), you typically do NOT run a long-lived poller.
      Instead, configure Lambda SQS event source mapping.
    - In local dev, this poller is a convenient way to mimic the async worker.
    """

    store = build_store()
    poller = SqsPoller.from_env()

    poller.run_forever(lambda payload, raw_message=None: handle_message(payload, store=store, raw_message=raw_message))


if __name__ == "__main__":
    main()