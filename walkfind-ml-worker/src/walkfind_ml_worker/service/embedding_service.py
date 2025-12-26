from dataclasses import dataclass
from typing import List, Protocol
from ..job import EmbeddingJob
from ..infra.db import Db
from ..embed.openclip_embedder import OpenClipEmbedder

class ObjectStore(Protocol):
    """Storage abstraction.

    Implementations can fetch objects from S3 (production) or local filesystem (dev).
    """

    def get_bytes(self, key: str) -> bytes:
        ...

@dataclass
class EmbeddingService:
    store: ObjectStore
    db: Db
    embedder: OpenClipEmbedder

    def _photo_exists(self, conn, job) -> bool:
        # job.photoType: "USER" or "MODEL"
        with conn.cursor() as cur:
            if job.photoType == "USER":
                cur.execute("SELECT 1 FROM user_photos WHERE id = %s", (job.photoId,))
            elif job.photoType == "MODEL":
                cur.execute("SELECT 1 FROM contest_model_photos WHERE id = %s", (job.photoId,))
            else:
                raise ValueError(f"unknown photoType: {job.photoType}")
            return cur.fetchone() is not None

    def run_once(self, job: EmbeddingJob) -> None:
        img_bytes = self.store.get_bytes(job.storageKey)

        # 2) embedding算出
        emb: List[float] = self.embedder.encode_image_bytes(img_bytes)

        # 3) DBへUPSERT（READYにする）
        conn = self.db.connect()
        try:
            if not self._photo_exists(conn, job):
                # ここは「成功扱い」でOK（存在しないものは作れないので）
                return
            
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO photo_embeddings (
                        contest_id,
                        photo_id,
                        photo_type,
                        storage_key,
                        model_version,
                        status,
                        embedding,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        %(contest_id)s,
                        %(photo_id)s,
                        %(photo_type)s,
                        %(storage_key)s,
                        %(model_version)s,
                        'READY',
                        %(embedding)s,
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (contest_id, photo_id, photo_type, model_version)
                    DO UPDATE SET
                        status = 'READY',
                        storage_key = EXCLUDED.storage_key,
                        embedding = EXCLUDED.embedding,
                        updated_at = NOW()
                    """,
                    {
                        "contest_id": job.contestId,
                        "photo_id": job.photoId,
                        "photo_type": job.photoType,
                        "storage_key": job.storageKey,
                        "model_version": job.modelVersion,
                        "embedding": emb,
                    },
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()