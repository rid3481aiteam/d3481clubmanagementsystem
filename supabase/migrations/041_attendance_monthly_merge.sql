-- ════════════════════════════════════════════
-- 041_attendance_monthly_merge.sql
-- 「出席月報」與「社友增減月報」在畫面上合併成一個頁面（統稱「出席月報」），
-- 這支 migration 只處理底層資料的調整，不動資料表結構本身：
--
-- 1. 重新定義 club_monthly_attendance_rate view：把原本的
--    present／counted（扣除免計人數的計入人次，Rotary 官方出席率算法
--    用的分母）改成使用者更直覺的語言 expected（應出席人次，即每次
--    例會的 total 加總）／actual（實際出席人次，即 present 加總）。
--    rate 的算法本身不動（present / (total - exempt) * 100，維持跟
--    attendance_sessions.rate、member_attendance_rate 一致的官方公式），
--    只是不再把「計入人次」單獨秀出來，改秀應出席/實際出席這兩個
--    使用者比較容易理解的數字。
--
-- 2. 不需要新表——「例會沒有透過『新增例會』建立，也要能在月報裡
--    補登出席人數」這個需求，直接讓前端在既有的 meetings/
--    attendance_sessions 兩張表上「找到當天例會就更新、找不到就新增」，
--    不用逐人出席明細（attendance_details 留空），沿用既有 RLS
--    （has_permission('meetings','edit') / has_permission('attendance','edit')），
--    不需要新的資料表或欄位。
-- ════════════════════════════════════════════

DROP VIEW IF EXISTS club_monthly_attendance_rate;

CREATE VIEW club_monthly_attendance_rate
WITH (security_invoker = true)
AS
SELECT
  m.club_id,
  to_char(date_trunc('month', m.date), 'YYYY-MM') AS month,
  COUNT(DISTINCT m.id) AS meeting_count,
  SUM(s.total) AS expected,
  SUM(s.present) AS actual,
  ROUND(
    SUM(s.present)::numeric / NULLIF(SUM(s.total - s.exempt), 0) * 100,
    1
  ) AS rate
FROM meetings m
JOIN attendance_sessions s ON s.meeting_id = m.id
GROUP BY m.club_id, date_trunc('month', m.date);
