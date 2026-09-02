-- ════════════════════════════════════════════
-- 078_roster_club_position_add_cp.sql
-- 社內職稱新增「CP」（創社社長 Charter President）。021 migration 建立
-- 這個欄位時只有 'PP', 'IPP', 'P', 'VP', 'PE', 'S', '社友' 七種，用
-- CHECK constraint 限制，沒有明確命名，Postgres 自動產生的名稱是
-- roster_club_position_check（021 之後沒有其他 migration 動過這個
-- constraint，可以直接沿用這個自動產生的名稱）。
-- ════════════════════════════════════════════

ALTER TABLE roster DROP CONSTRAINT IF EXISTS roster_club_position_check;

ALTER TABLE roster ADD CONSTRAINT roster_club_position_check
  CHECK (club_position IN ('PP', 'IPP', 'CP', 'P', 'VP', 'PE', 'S', '社友'));
