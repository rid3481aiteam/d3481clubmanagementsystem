-- ════════════════════════════════════════════
-- 077_add_taipei_west_rotaract.sql
-- 新增「台北西區扶青社」（比照輔導社台北西區扶輪社所在的第二分區），
-- 僅 name + zone，其餘聯絡資訊留空，待後台「編輯社團」補齊
-- 可重複執行：已存在同名社團會自動略過
-- ════════════════════════════════════════════

INSERT INTO clubs (name, zone)
SELECT '台北西區扶青社', '第二分區'
WHERE NOT EXISTS (
  SELECT 1 FROM clubs WHERE name = '台北西區扶青社'
);
