from __future__ import annotations
import boto3
from .object_store import ObjectStore

class S3ObjectStore(ObjectStore):
    def __init__(self, bucket: str, region: str | None = None):
        self.bucket = bucket
        self.s3 = boto3.client("s3", region_name=region)

    def get_bytes(self, key: str) -> bytes:
        obj = self.s3.get_object(Bucket=self.bucket, Key=key)
        return obj["Body"].read()