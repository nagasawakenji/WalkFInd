from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

PhotoType = Literal["USER", "MODEL"]


@dataclass(frozen=True)
class EmbeddingJob:
    contestId: int
    photoId: int
    photoType: PhotoType
    storageKey: str
    modelVersion: str
    # NOTE:
    # - In production (S3ObjectStore), the store already knows the bucket.
    # - In local dev (LocalObjectStore), bucket is meaningless.
    # Keep this optional for backward compatibility with older payloads/code.
    bucket: str = ""

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "EmbeddingJob":
        if not isinstance(d, dict):
            raise ValueError("payload must be a dict")

        # Accept camelCase or snake_case
        contest_id = d.get("contestId") or d.get("contest_id")
        photo_id = d.get("photoId") or d.get("photo_id")
        photo_type = d.get("photoType") or d.get("photo_type")
        model_version = d.get("modelVersion") or d.get("model_version")

        # 表記揺れを限界まで吸収する ; ;
        photo_key = (
            d.get("storageKey")
            or d.get("storage_key")
            or d.get("photoKey")
            or d.get("photo_key")
            or d.get("key")
            or d.get("photoUrl")
            or d.get("photo_url")
        )

        # Bucket is optional (ElasticMQ/local dev usually won't include it)
        bucket = d.get("bucket") or d.get("Bucket") or ""

        # Validate type early to avoid downstream surprises
        if photo_type is not None:
            photo_type = str(photo_type).upper()
        if photo_type not in ("USER", "MODEL"):
            raise ValueError(f"invalid photoType: {photo_type}. payload={d}")

        missing = [
            name
            for name, value in [
                ("contestId", contest_id),
                ("photoId", photo_id),
                ("photoType", photo_type),
                ("storageKey/key", photo_key),
                ("modelVersion", model_version),
            ]
            if value is None or (isinstance(value, str) and value.strip() == "")
        ]
        if missing:
            raise ValueError(f"missing required fields: {missing}. payload={d}")

        return EmbeddingJob(
            contestId=int(contest_id),
            photoId=int(photo_id),
            photoType=photo_type,  # type: ignore[arg-type]
            storageKey=str(photo_key),
            modelVersion=str(model_version),
            bucket=str(bucket),
        )