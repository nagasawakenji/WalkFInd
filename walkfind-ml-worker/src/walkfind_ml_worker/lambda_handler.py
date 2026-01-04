import json
import logging
from typing import Any, Dict, List

from walkfind_ml_worker.main import build_store
from walkfind_ml_worker.handler import handle_message

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Lambda コンテナ再利用で store/DB 接続を使い回す
_STORE = build_store()


def handler(event: Dict[str, Any], context: Any) -> Dict[str, List[Dict[str, str]]]:
    """
    SQS trigger entrypoint.

    - event["Records"] に SQS メッセージが入る
    - 失敗した messageId だけ再試行させたいので ReportBatchItemFailures 形式で返す
    - PCA/Embedding の分岐は handle_message 側（worker側）に集約する
    """
    records = event.get("Records") or []
    failures: List[Dict[str, str]] = []

    logger.info("[lambda] received records=%d", len(records))

    for r in records:
        msg_id = r.get("messageId", "unknown")
        body = r.get("body", "")

        if not body or not str(body).strip():
            # 空 body は捌きようがないので、ここでは ACK 扱いで捨てる（必要なら failures に入れてOK）
            logger.warning("[lambda] skip empty body messageId=%s", msg_id)
            continue

        # JSON パース（ここで落ちたらそのメッセージだけリトライ対象）
        try:
            payload = json.loads(body)
        except Exception:
            logger.exception("[lambda] invalid json messageId=%s body=%s", msg_id, body)
            failures.append({"itemIdentifier": msg_id})
            continue

        # 実処理（PCA/Embedding どちらでも handle_message が判断する）
        try:
            ok = handle_message(payload, store=_STORE, raw_message=r)
            job_type = (payload.get("type") or payload.get("jobType") or "EMBEDDING")

            if ok:
                logger.info(
                    "[lambda] success messageId=%s jobType=%s payloadKeys=%s",
                    msg_id,
                    job_type,
                    list(payload.keys()) if isinstance(payload, dict) else [],
                )
            else:
                # handle_message は例外時に False を返す実装なので、ここで failures に入れる
                logger.error(
                    "[lambda] failed(returned False) messageId=%s jobType=%s payload=%s",
                    msg_id,
                    job_type,
                    payload,
                )
                failures.append({"itemIdentifier": msg_id})

        except Exception:
            # ここは「想定外の例外」保険（基本 handle_message 側で握って False 返す設計）
            logger.exception("[lambda] unexpected error messageId=%s body=%s", msg_id, body)
            failures.append({"itemIdentifier": msg_id})

    return {"batchItemFailures": failures}