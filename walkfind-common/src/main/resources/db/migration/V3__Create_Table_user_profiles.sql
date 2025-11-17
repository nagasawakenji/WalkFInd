-- -----------------------------------------------------
-- user_profiles (公開プロフィール情報とデノーマライズ統計)
-- -----------------------------------------------------
CREATE TABLE user_profiles (
    -- PK/FK: usersテーブルのIDを参照
    user_id VARCHAR(128) PRIMARY KEY REFERENCES users (id),

    -- 公開プロフィール情報
    profile_image_url VARCHAR(512),
    bio TEXT,

    -- 統計情報 (低レイテンシ読み取り用)
    total_posts INTEGER NOT NULL DEFAULT 0,
    total_contests_entered INTEGER NOT NULL DEFAULT 0,
    best_rank INTEGER NOT NULL DEFAULT 0, -- 0: 未参加/未ランクイン

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_profiles IS 'ユーザーの公開用プロフィール情報と、低レイテンシ読み取りのための集計統計情報を管理します。';