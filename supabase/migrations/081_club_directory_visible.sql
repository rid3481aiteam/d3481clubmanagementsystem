-- ════════════════════════════════════════════
-- 081_club_directory_visible.sql
-- clubs 新增 directory_visible 欄位，讓「地區通訊錄」可以先不顯示
-- 特定社（例如聯絡資訊還沒補齊、或性質特殊還不確定要不要放進通訊錄
-- 的社），不影響該社在系統其他地方（社團總覽、名冊、出席等）正常
-- 運作——只是這個社在通訊錄這個畫面先隱藏，不是刪除或停用。
--
-- 這輪先套用在「台北西區扶青社」（077 migration 新增，扶青社/
-- Rotaract 不是一般扶輪社，聯絡資訊也還沒補，暫時先不放進地區通訊錄）。
-- ════════════════════════════════════════════

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT true;

UPDATE clubs
SET directory_visible = false
WHERE name = '台北西區扶青社';
