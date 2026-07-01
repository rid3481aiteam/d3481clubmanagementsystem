-- ════════════════════════════════════════════
-- 005_add_year_term.sql
-- 例會加入扶輪年度欄位（7/1~6/30 為一屆）
-- 格式：'2025-2026'
-- ════════════════════════════════════════════

ALTER TABLE meetings
  ADD COLUMN year_term text NOT NULL
  GENERATED ALWAYS AS (
    to_char(
      CASE WHEN extract(month FROM date) >= 7 THEN date
           ELSE date - interval '1 year'
      END,
      'YYYY'
    ) || '-' ||
    to_char(
      CASE WHEN extract(month FROM date) >= 7 THEN date + interval '1 year'
           ELSE date
      END,
      'YYYY'
    )
  ) STORED;

CREATE INDEX meetings_year_term_idx ON meetings (club_id, year_term);
