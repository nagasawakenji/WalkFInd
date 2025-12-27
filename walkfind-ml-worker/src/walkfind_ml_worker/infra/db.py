import json
import os
from functools import lru_cache

import psycopg2
from pgvector.psycopg2 import register_vector


@lru_cache(maxsize=1)
def _load_db_secret(secret_id: str, region: str) -> dict:
    """Load DB credentials from AWS Secrets Manager.

    The secret value should be a JSON object like:
      {
        "host": "...",
        "port": 6543,
        "dbname": "postgres",
        "username": "...",
        "password": "..."
      }

    Notes:
    - Cached per process (Lambda container reuse friendly)
    - Does NOT log secret contents
    """
    try:
        import boto3  
    except Exception as e:
        raise RuntimeError(
            "boto3 is required to load DB secrets from Secrets Manager. "
            "Install boto3 or disable DB_SECRET_ID."
        ) from e

    client = boto3.client("secretsmanager", region_name=region)
    resp = client.get_secret_value(SecretId=secret_id)

    secret_str = resp.get("SecretString")
    if not secret_str:
        raise RuntimeError("SecretString is missing in Secrets Manager response")

    try:
        return json.loads(secret_str)
    except json.JSONDecodeError as e:
        raise RuntimeError("DB secret is not valid JSON") from e


class Db:
    def __init__(self, host: str, port: int, name: str, user: str, password: str, sslmode: str):
        self._dsn = (
            f"host={host} port={port} dbname={name} user={user} password={password} sslmode={sslmode}"
        )

    @classmethod
    def from_config(cls, cfg) -> "Db":
        """Build Db from Config.

        Priority:
        1) If cfg.db_secret_id is set -> load host/user/password from Secrets Manager
        2) Else -> use cfg.db_host/cfg.db_user/cfg.db_password directly

        This keeps local/dev simple while allowing production to avoid plaintext env vars.
        """
        region = getattr(cfg, "aws_region", os.getenv("AWS_REGION", "ap-northeast-1"))
        sslmode = getattr(cfg, "db_sslmode", os.getenv("DB_SSLMODE", "require"))

        secret_id = getattr(cfg, "db_secret_id", None) or os.getenv("DB_SECRET_ID")
        if secret_id:
            s = _load_db_secret(secret_id, region)

            host = s.get("host")
            port = int(s.get("port", 5432))
            # spring bootが標準でクエリパラメーターをつける関係で、secretのdb名前にパラメーターが追加されています
            # そのため、ここで名前を整形しています
            raw_name = s.get("dbname") or s.get("db_name") or s.get("name") or "postgres"
            name = raw_name.split('?')[0]
            user = s.get("username") or s.get("user")
            password = s.get("password")

            missing = [k for k, v in [("host", host), ("username", user), ("password", password)] if not v]
            if missing:
                raise RuntimeError(f"DB secret missing required keys: {missing}")

            # If secret includes sslmode, prefer it; otherwise keep cfg/env
            sslmode = s.get("sslmode") or sslmode

            return cls(host=host, port=port, name=name, user=user, password=password, sslmode=sslmode)

        # Fallback: plain env/config values
        host = getattr(cfg, "db_host", os.getenv("DB_HOST", "localhost"))
        port = int(getattr(cfg, "db_port", os.getenv("DB_PORT", "5432")))
        name = getattr(cfg, "db_name", os.getenv("DB_NAME", "walkfind"))
        user = getattr(cfg, "db_user", os.getenv("DB_USER", "postgres"))
        password = getattr(cfg, "db_password", os.getenv("DB_PASSWORD", "postgres"))

        return cls(host=host, port=port, name=name, user=user, password=password, sslmode=sslmode)

    def connect(self):
        conn = psycopg2.connect(self._dsn)

        # psycopg2 defaults to autocommit=False, but set it explicitly BEFORE any SQL runs.
        # NOTE: pgvector's `register_vector(conn)` may execute SQL (type OID lookup), which starts a transaction.
        conn.autocommit = False

        register_vector(conn)

        # `register_vector` can leave the connection in an open transaction state.
        # Clear it so the first real business query starts clean.
        try:
            conn.rollback()
        except Exception:
            pass

        return conn