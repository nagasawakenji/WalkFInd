import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Config:
    aws_region: str = os.getenv("AWS_REGION", "ap-northeast-1")

    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "walkfind")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")
    db_sslmode: str = os.getenv("DB_SSLMODE", "prefer")

    # embedding
    model_version: str = os.getenv("EMBEDDING_MODEL_VERSION", "openclip-vitb32-v1")
    openclip_model: str = os.getenv("OPENCLIP_MODEL", "ViT-B-32")
    openclip_pretrained: str = os.getenv("OPENCLIP_PRETRAINED", "openai")
    