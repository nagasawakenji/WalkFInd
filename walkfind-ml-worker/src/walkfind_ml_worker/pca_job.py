from __future__ import annotations
import numpy as np

def _to_np(v) -> np.ndarray:
    return np.asarray(v, dtype=np.float32)

def _fixed_orthonormal_W(d: int, dim: int, seed: int = 0) -> np.ndarray:
    """
    n<2 のフォールバック用：決定的（seed固定）な直交基底 W (d, dim) を作る。
    """
    rng = np.random.default_rng(seed)
    A = rng.standard_normal((d, dim)).astype(np.float32)
    Q, _ = np.linalg.qr(A)   # (d, dim) 直交
    return Q[:, :dim].astype(np.float32)

def fit_pca(X: np.ndarray, dim: int) -> tuple[np.ndarray, np.ndarray]:
    d = X.shape[1]
    n = X.shape[0]

    # ---- n == 1 (only one sample): map it to origin deterministically ----
    if n == 1:
        mean = X[0].astype(np.float32)
        # Deterministic orthonormal basis (d, dim)
        W = _fixed_orthonormal_W(d=d, dim=dim, seed=0)
        return mean, W

    # ---- n == 2: align first axis with the difference vector ----
    if n == 2:
        mean = X.mean(axis=0).astype(np.float32)
        v = (X[1] - X[0]).astype(np.float32)
        norm = float(np.linalg.norm(v))

        if norm < 1e-12:
            # Two identical points: fall back to deterministic basis
            W = _fixed_orthonormal_W(d=d, dim=dim, seed=0)
            return mean, W

        u1 = (v / norm).reshape(d, 1)  # (d, 1)

        # Build an orthonormal basis with u1 as the first column.
        # Add random columns and orthonormalize via QR (seed fixed -> deterministic).
        rng = np.random.default_rng(0)
        A = rng.standard_normal((d, max(dim, 2) - 1)).astype(np.float32)
        B = np.concatenate([u1, A], axis=1)  # (d, >=dim)
        Q, _ = np.linalg.qr(B)               # (d, >=dim)
        W = Q[:, :dim].astype(np.float32)
        return mean, W

    # ---- n >= 3: standard PCA ----
    mean = X.mean(axis=0).astype(np.float32)
    Xc = X - mean

    _, _, Vt = np.linalg.svd(Xc, full_matrices=False)

    k = min(dim, Vt.shape[0])
    Wk = Vt[:k].T.astype(np.float32)

    if k < dim:
        pad = np.zeros((d, dim - k), dtype=np.float32)
        W = np.concatenate([Wk, pad], axis=1)
    else:
        W = Wk

    return mean, W

def project_all(X: np.ndarray, mean: np.ndarray, W: np.ndarray) -> np.ndarray:
    """
    Return Z: (n, dim)
    """
    Z = (X - mean) @ W
    return Z.astype(np.float32)