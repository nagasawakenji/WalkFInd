from __future__ import annotations
import numpy as np

def fetch_ready_model_embeddings(conn, contestId: int, model_version: str):
    sql = """
    SELECT
      id AS model_photo_id,
      embedding
    FROM photo_embeddings
    WHERE contest_id = %s
    AND photo_type = 'MODEL'
    AND status = 'READY'
    AND model_version = %s
    AND embedding IS NOT NULL
    """
    with conn.cursor() as cur:
        cur.execute(sql, (contestId, model_version))
        return cur.fetchall()

def upsert_contest_projection_basis(conn, contest_id: int, model_version: str, method: str, dim: int,
                                    mean: np.ndarray, components: np.darray) -> int:
    
    mean_list = mean.astype(np.float32).tolist()
    comp_list = components.astype(np.float32).reshape(-1).tolist() 

    sql = """
    INSERT INTO contest_projection_basis
    (contest_id, model_version, method, dim, mean, components)
    VALUES (%s, %s, %s, %s, %s, %s)
    ON CONFLICT (contest_id, model_version, method, dim)
    DO UPDATE SET
      mean = excluded.mean,
      components = excluded.components,
      updated_at = now()
    returning id
    """
    with conn.cursor() as cur:
        cur.execute(sql, (contest_id, model_version, method, dim, mean_list, comp_list))
        (basis_id, ) = cur.fetchone()
        return basis_id

def upsert_model_photo_projections(conn, contest_id: int, model_version: str, model_photo_ids: list[int], Z: np.ndarray):

    dim = Z.shape[1]
    values = []
    for i, model_photo_id in enumerate(model_photo_ids):
        x = float(Z[i, 0])
        y = float(Z[i, 1])
        z = float(Z[i, 2]) if dim >= 3 else None
        values.append((contest_id, model_version, model_photo_id, x, y, z ))
    
    sql = """
    INSERT INTO contest_model_photo_projection
    (contest_id, model_version, model_photo_id, x, y, z)
    VALUES (%s, %s, %s, %s, %s, %s)
    ON CONFLICT (contest_id, model_version, model_photo_id)
    DO UPDATE SET
      x = excluded.x,
      y = excluded.y,
      z = excluded.z,
      updated_at = now()
    """
    with conn.cursor() as cur:
        cur.executemany(sql, values)