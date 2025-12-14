BEGIN;

-- fkey制約を一旦落とす
ALTER TABLE votes
  DROP CONSTRAINT votes_photo_id_fkey;

-- 写真削除ができるように、on delete cascadeを追加する
ALTER TABLE votes
  ADD CONSTRAINT votes_photo_id_fkey
  FOREIGN KEY (photo_id)
  REFERENCES user_photos (id)
  ON DELETE CASCADE;


ALTER TABLE votes
  DROP CONSTRAINT votes_user_id_fkey;

ALTER TABLE votes
  ADD CONSTRAINT votes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

COMMIT;