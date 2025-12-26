import argparse
import json
from .config import Config
from .job import EmbeddingJob
from .infra.s3_object_store import S3Client
from .infra.db import Db
from .embed.openclip_embedder import OpenClipEmbedder
from .service.embedding_service import EmbeddingService

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", required=True, help="job json file path")
    args = ap.parse_args()

    cfg = Config()
    with open(args.job, "r", encoding="utf-8") as f:
        job = EmbeddingJob.from_dict(json.load(f))

    svc = EmbeddingService(
        s3=S3Client(cfg.aws_region),
        db=Db(cfg.db_host, cfg.db_port, cfg.db_name, cfg.db_user, cfg.db_password, cfg.db_sslmode),
        embedder=OpenClipEmbedder(cfg.openclip_model, cfg.openclip_pretrained),
    )
    svc.run_once(job)
    print("OK")

if __name__ == "__main__":
    main()