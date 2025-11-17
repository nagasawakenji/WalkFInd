-- -----------------------------------------------------
-- 1. contests (コンテスト基本情報)
-- -----------------------------------------------------
CREATE TABLE contests (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    theme TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, -- ('UPCOMING', 'IN_PROGRESS', 'CLOSED_VOTING', 'ANNOUNCED')
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE contests IS 'コンテストの基本情報と期間を管理します。';

-- -----------------------------------------------------
-- 2. users (登録ユーザーの基本情報)
-- -----------------------------------------------------
CREATE TABLE users (
    id VARCHAR(128) PRIMARY KEY, -- Cognitoのsub (User ID)を想定
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'USER', -- 拡張性のため
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (username);
COMMENT ON TABLE users IS 'ユーザーの基本情報と認証IDを管理します。';


-- -----------------------------------------------------
-- 3. user_photos (写真投稿)
-- -----------------------------------------------------
CREATE TABLE user_photos (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests (id),
    user_id VARCHAR(128) NOT NULL REFERENCES users (id),
    photo_url VARCHAR(512) NOT NULL, -- Cloudflare R2/S3のURL
    title VARCHAR(100) NOT NULL,
    description TEXT,
    submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_votes INTEGER NOT NULL DEFAULT 0,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- 管理者承認フラグ

    -- 1コンテストに対して1ユーザー1投稿のみを保証
    CONSTRAINT uq_contest_user UNIQUE (contest_id, user_id)
);

CREATE INDEX idx_photos_contest_id ON user_photos (contest_id);
COMMENT ON TABLE user_photos IS 'コンテストへの写真投稿を管理します。';


-- -----------------------------------------------------
-- 4. votes (投票情報)
-- -----------------------------------------------------
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    photo_id BIGINT NOT NULL REFERENCES user_photos (id),
    user_id VARCHAR(128) NOT NULL REFERENCES users (id),
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 1投稿に対して1ユーザー1投票のみを保証
    CONSTRAINT uq_vote_user_photo UNIQUE (photo_id, user_id)
);

CREATE INDEX idx_votes_photo_id ON votes (photo_id);
COMMENT ON TABLE votes IS 'ユーザーによる投稿への投票を記録します。';