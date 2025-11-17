--------------------------------------------------------
--- 4.contest_results (終了したコンテストに投稿された写真の成績を記録する)
--------------------------------------------------------
CREATE TABLE contest_results (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id),
    photo_id BIGINT NOT NULL REFERENCES user_photos(id),
    final_rank INTEGER NOT NULL,
    final_score INTEGER NOT NULL,
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 1コンテストで1投稿の成績は1つのみ
    UNIQUE (contest_id, photo_id)
);

-- 成績参照時の高速化のため、コンテストIDと順位にインデックスを設定
CREATE INDEX idx_contest_results_contest_rank ON contest_results (contest_id, final_rank);