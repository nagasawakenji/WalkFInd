-- -----------------------------------------------------
-- contest_model_photos(コンテストの見本写真) エンティティ追加は任意
-- -----------------------------------------------------

CREATE TABLE contest_model_photos (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    photo_url VARCHAR(1024) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);