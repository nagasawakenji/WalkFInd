-- user_photos テーブルに updated_at カラムを追加
ALTER TABLE user_photos
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 既存データの updated_at を submission_date で補完（NULL防止）
UPDATE user_photos
SET updated_at = submission_date
WHERE updated_at IS NULL;

-- NOT NULL 制約を追加
ALTER TABLE user_photos
ALTER COLUMN updated_at SET NOT NULL;