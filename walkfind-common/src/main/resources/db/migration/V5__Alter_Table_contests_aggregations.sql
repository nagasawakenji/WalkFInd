-- -----------------------------------------------------
-- contestsに集計完了フラグと集計完了時刻からむを追加
-- -----------------------------------------------------

ALTER TABLE contests
ADD COLUMN aggregation_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN aggregation_completed_at TIMESTAMPTZ;