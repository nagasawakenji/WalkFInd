ALTER TABLE photo_embeddings
ADD CONSTRAINT uq_photo_embeddings
UNIQUE (contest_id, photo_id, photo_type, model_version);