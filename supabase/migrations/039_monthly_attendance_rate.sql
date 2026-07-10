-- ════════════════════════════════════════════
-- 039_monthly_attendance_rate.sql
-- 各社「每月出席率」統計，供社儀表板（當月）+ 歷月查詢 +
-- 地區月報使用。
--
-- 既有出席率統計（member_attendance_rate、各儀表板的 avgRate）都是以
-- year_term（扶輪年度）為單位，這是 ARCHITECTURE.md 記載的既有設計決定，
-- 這裡不去動它，另外新增一個「以月份為單位」的統計層，兩者並存。
--
-- 「每月自動同步到地區」不需要另外做批次/排程工作：這個 view 直接查
-- meetings + attendance_sessions 兩張表，這兩張表的 RLS 本來就是
-- club_id = current_club_id() OR is_district_viewer()（見 003、030），
-- 加上 security_invoker = true 後，view 會照樣套用底層表的 RLS——
-- 地區（唯讀）/地區管理員原本就能查到全部社團的出席資料，等於「即時同步」，
-- 比批次同步更即時也不會有過期資料的問題。
-- ════════════════════════════════════════════

CREATE VIEW club_monthly_attendance_rate
WITH (security_invoker = true)
AS
SELECT
  m.club_id,
  to_char(date_trunc('month', m.date), 'YYYY-MM') AS month,
  COUNT(DISTINCT m.id) AS meeting_count,
  SUM(s.present) AS present,
  SUM(s.total - s.exempt) AS counted,
  ROUND(
    SUM(s.present)::numeric / NULLIF(SUM(s.total - s.exempt), 0) * 100,
    1
  ) AS rate
FROM meetings m
JOIN attendance_sessions s ON s.meeting_id = m.id
GROUP BY m.club_id, date_trunc('month', m.date);
