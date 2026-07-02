-- ════════════════════════════════════════════
-- 017_roster_classification.sql
-- 社友名冊新增「職業分類」欄位（扶輪傳統的分類制度），
-- 供地區通訊錄的社團資訊頁統計「領域分布」用
-- ════════════════════════════════════════════

ALTER TABLE roster ADD COLUMN IF NOT EXISTS classification text;
