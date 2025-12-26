import json
import logging
from typing import Any, Dict, List, Optional

from walkfind_ml_worker.main import build_store
from walkfind_ml_worker.handler import handle_message

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# dbとの接続は使い回す
_STORE = build_store()


def handler(event: Dict[str, Any], context: Any) -> Dict[str, List[Dict[str, str]]]:
    """
    SQS trigger entrypoint.
    event["Records"] に SQS メッセージが入る。
    失敗した messageId だけ再試行させたいので、ReportBatchItemFailures 形式で返す。
    """
    records = event.get("Records", []) or []
    failures: List[Dict[str, str]] = []

    logger.info("[lambda] received records=%d", len(records))

    for r in records:
        msg_id: str = r.get("messageId", "unknown")
        body: str = r.get("body", "")

        try:
            payload = json.loads(body) if body else {"raw": body}

            handle_message(payload, store=_STORE, raw_message=r)

            logger.info("[lambda] success messageId=%s payloadKeys=%s", msg_id, list(payload.keys()))

        except Exception:
            logger.exception("[lambda] failed messageId=%s body=%s", msg_id, body)
            # 失敗したもののみを再施行する
            failures.append({"itemIdentifier": msg_id})

    return {"batchItemFailures": failures}