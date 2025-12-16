-- user_photos に論理削除用カラムを追加
ALTER TABLE user_photos
ADD COLUMN removed_at TIMESTAMPTZ,
ADD COLUMN removed_by_user_id VARCHAR(128);

-- インデックスも追加
CREATE INDEX IF NOT EXISTS idx_user_photos_contest_removed_at
ON user_photos (contest_id, removed_at);

CREATE INDEX IF NOT EXISTS idx_user_photos_removed_at
ON user_photos (removed_at);