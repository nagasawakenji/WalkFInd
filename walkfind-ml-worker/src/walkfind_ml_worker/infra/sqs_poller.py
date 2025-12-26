from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PollerConfig:
    """Configuration for SQS/ElasticMQ polling."""

    queue_url: str
    region: str = "ap-northeast-1"

    # If set, boto3 will talk to this endpoint (useful for ElasticMQ: http://localhost:9324)
    endpoint_url: Optional[str] = None

    # Long polling settings
    wait_time_seconds: int = 10
    max_number_of_messages: int = 1

    # If your handler may take time, increase this.
    visibility_timeout: int = 30

    # Small sleep between empty receives to avoid busy loop
    idle_sleep_seconds: float = 0.2


def _parse_json_maybe(s: str) -> Any:
    try:
        return json.loads(s)
    except Exception:
        return None


def _unwrap_body(body: str) -> Dict[str, Any]:
    """Unwrap common envelopes and return a dict payload.

    We support these cases:
    1) body is JSON dict payload
    2) body is JSON with key "Message" (SNS->SQS style), where Message is JSON string
    3) body is plain string (we return {"raw": body})
    """
    parsed = _parse_json_maybe(body)
    if isinstance(parsed, dict):
        # SNS -> SQS envelope often has "Message" field
        if "Message" in parsed and isinstance(parsed["Message"], str):
            inner = _parse_json_maybe(parsed["Message"])
            if isinstance(inner, dict):
                return inner
        return parsed

    # Not JSON
    return {"raw": body}


class SqsPoller:
    """Simple SQS poller for local development (ElasticMQ) and non-Lambda runs.

    Usage:
      poller = SqsPoller.from_env()
      poller.run_forever(handler)

    handler signature:
      def handler(payload: dict, *, message_id: str) -> bool:
          ...
          return True  # delete message
          return False # keep message (will be retried after visibility timeout)

    Notes:
    - On exception inside handler, the message is NOT deleted.
    - This is best-effort and intentionally minimal.
    """

    def __init__(self, cfg: PollerConfig):
        self.cfg = cfg

        # Import boto3 lazily so local unit tests can run without it.
        try:
            import boto3  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "boto3 is required for SqsPoller. Install boto3 or run without polling."
            ) from e

        # IMPORTANT:
        # - For local ElasticMQ, we must NOT sign requests. Some ElasticMQ/Pekko setups reject
        #   the SigV4 Authorization header (it contains slashes in the Credential part).
        # - For real AWS SQS, we should use the normal credential chain (IAM role on Lambda).
        try:
            from botocore.config import Config  # type: ignore
            from botocore import UNSIGNED  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "botocore is required for SqsPoller (it is normally installed with boto3)."
            ) from e

        if cfg.endpoint_url:
            # Local (ElasticMQ): unsigned requests + dummy credentials
            self._client = boto3.client(
                "sqs",
                region_name=cfg.region,
                endpoint_url=cfg.endpoint_url,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "dummy"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "dummy"),
                config=Config(signature_version=UNSIGNED),
            )
        else:
            # Production (AWS SQS): use default credential chain (IAM role, env, etc.)
            self._client = boto3.client(
                "sqs",
                region_name=cfg.region,
            )

    @classmethod
    def from_env(cls) -> "SqsPoller":
        queue_url = os.getenv("EMBEDDING_QUEUE_URL") or os.getenv("SQS_QUEUE_URL")
        if not queue_url:
            raise RuntimeError(
                "Missing EMBEDDING_QUEUE_URL (or SQS_QUEUE_URL). "
                "Example (ElasticMQ): http://localhost:9324/000000000000/walkfind-embedding"
            )

        region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "ap-northeast-1"
        endpoint_url = os.getenv("SQS_ENDPOINT_URL") 

        wait_time_seconds = int(os.getenv("SQS_WAIT_TIME_SECONDS", "10"))
        max_messages = int(os.getenv("SQS_MAX_MESSAGES", "1"))
        visibility_timeout = int(os.getenv("SQS_VISIBILITY_TIMEOUT", "30"))
        idle_sleep_seconds = float(os.getenv("SQS_IDLE_SLEEP_SECONDS", "0.2"))

        cfg = PollerConfig(
            queue_url=queue_url,
            region=region,
            endpoint_url=endpoint_url,
            wait_time_seconds=wait_time_seconds,
            max_number_of_messages=max_messages,
            visibility_timeout=visibility_timeout,
            idle_sleep_seconds=idle_sleep_seconds,
        )
        return cls(cfg)

    def run_forever(
        self,
        handler: Callable[..., Any],
    ) -> None:
        """Start polling loop.

        The handler may accept either:
          handler(payload_dict) -> bool
        or:
          handler(payload_dict, raw_message) -> bool

        (We type this as `Callable[..., Any]` for Python 3.9 compatibility; runtime behavior is unchanged.)
        """
        logger.info(
            "Starting SQS poller. queue_url=%s endpoint=%s region=%s",
            self.cfg.queue_url,
            self.cfg.endpoint_url,
            self.cfg.region,
        )

        while True:
            try:
                resp = self._client.receive_message(
                    QueueUrl=self.cfg.queue_url,
                    MaxNumberOfMessages=self.cfg.max_number_of_messages,
                    WaitTimeSeconds=self.cfg.wait_time_seconds,
                    VisibilityTimeout=self.cfg.visibility_timeout,
                    MessageAttributeNames=["All"],
                    AttributeNames=["All"],
                )

                messages = resp.get("Messages", [])
                if not messages:
                    time.sleep(self.cfg.idle_sleep_seconds)
                    continue

                for m in messages:
                    message_id = m.get("MessageId")
                    receipt_handle = m.get("ReceiptHandle")
                    body = m.get("Body", "")

                    payload = _unwrap_body(body)
                    logger.info(
                        "Received message. messageId=%s payloadKeys=%s",
                        message_id,
                        list(payload.keys()) if isinstance(payload, dict) else "(non-dict)",
                    )

                    delete_ok = False
                    try:
                        # Try calling handler(payload, raw_message) first; fallback to handler(payload)
                        try:
                            r = handler(payload, m)  # type: ignore[misc]
                        except TypeError:
                            r = handler(payload)  # type: ignore[misc]

                        delete_ok = bool(r)
                    except KeyboardInterrupt:
                        raise
                    except Exception:
                        logger.exception("Handler failed. messageId=%s", message_id)
                        delete_ok = False

                    if delete_ok:
                        if receipt_handle:
                            self._client.delete_message(
                                QueueUrl=self.cfg.queue_url,
                                ReceiptHandle=receipt_handle,
                            )
                            logger.info("Deleted message. messageId=%s", message_id)
                        else:
                            logger.warning(
                                "ReceiptHandle missing; cannot delete message. messageId=%s", message_id
                            )
                    else:
                        # Keep message: it will reappear after visibility timeout.
                        logger.warning(
                            "Message not deleted (will be retried). messageId=%s", message_id
                        )

            except KeyboardInterrupt:
                logger.info("SQS poller stopped by KeyboardInterrupt")
                return
            except Exception:
                logger.exception("SQS poller loop error; sleeping briefly")
                time.sleep(1.0)
