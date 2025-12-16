-- contests に論理削除用カラムを追加
ALTER TABLE contests
  ADD COLUMN removed_at TIMESTAMPTZ,
  ADD COLUMN removed_by_user_id VARCHAR(128),
  ADD COLUMN removed_reason TEXT;

-- removed判定の高速化（WHERE removed_at IS NULL を想定）
CREATE INDEX IF NOT EXISTS idx_contests_removed_at
  ON contests (removed_at);

-- よく使う一覧取得（active/announced等）を軽くする部分インデックス
CREATE INDEX IF NOT EXISTS idx_contests_status_start_date_active
  ON contests (status, start_date)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contests_status_end_date_active
  ON contests (status, end_date)
  WHERE removed_at IS NULL;