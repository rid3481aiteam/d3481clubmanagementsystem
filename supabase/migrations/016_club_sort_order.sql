-- ════════════════════════════════════════════
-- 016_club_sort_order.sql
-- clubs 新增自訂排序欄位，社團總覽可用上/下移按鈕調整
-- 同分區內排序，數字越小越前面
-- ════════════════════════════════════════════

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 初始化現有資料：保留目前畫面上「依社名排序」的順序，避免加欄位後畫面跳動
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY zone ORDER BY name) AS rn
  FROM clubs
)
UPDATE clubs c
SET sort_order = ordered.rn
FROM ordered
WHERE c.id = ordered.id;
