from __future__ import annotations
import logging
from dataclasses import dataclass
import numpy as np

from walkfind_ml_worker.infra.db import Db
from walkfind_ml_worker.pca_job import fit_pca, project_all, _to_np
from walkfind_ml_worker.pca_repo import (
    fetch_ready_model_embeddings,
    upsert_contest_projection_basis,
    upsert_model_photo_projections,
)

logger = logging.getLogger(__name__)

@dataclass
class PcaBasisService:
    db: Db

    def run_once(self, contestId: int, modelVersion: str, dim: int, minReady: int = 0) -> dict:
        conn = self.db.connect()
        try:
            rows = fetch_ready_model_embeddings(conn, contestId, modelVersion)
            ready = len(rows)

            # rows が 0 件なら投影も basis も作れないので SKIPPED（minReady=0でもここで止める）
            if ready == 0:
                conn.rollback()
                return {"status": "SKIPPED", "ready": 0, "min_ready": minReady, "reason": "NO_READY_ROWS"}

            if ready < minReady:
                conn.rollback()
                return {"status": "SKIPPED", "ready": ready, "min_ready": minReady}

            ids = [int(r[0]) for r in rows]
            X = np.stack([_to_np(r[1]) for r in rows], axis=0)  # (n,512)

            mean, W = fit_pca(X, dim)
            basis_id = upsert_contest_projection_basis(conn, contestId, modelVersion, "PCA", dim, mean, W)

            Z = project_all(X, mean, W)  # (n,dim)
            upsert_model_photo_projections(conn, contestId, modelVersion, ids, Z)

            conn.commit()
            return {"status": "OK", "basis_id": basis_id, "ready": ready, "dim": dim}

        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()