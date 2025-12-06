--------------------------------------------------------
--- contest_icons (コンテストのアイコン画像、任意)
--------------------------------------------------------

CREATE TABLE contest_icons (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT REFERENCES contests(id) ON DELETE CASCADE,
    icon_url VARCHAR(512),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
