-- コンテスト作成者（owner）を保持するカラムを追加

-- 本番/ローカルでadminのsubが異なるため、ここでは既存データの埋め込みは行わない
-- ひとまずFKは付けない（運用が固まったら段階的に追加します）
ALTER TABLE contests
  ADD COLUMN created_by_user_id VARCHAR(128);

-- 作成者での検索・自分のコンテスト一覧の高速化
CREATE INDEX IF NOT EXISTS idx_contests_created_by_user_id
  ON contests (created_by_user_id);