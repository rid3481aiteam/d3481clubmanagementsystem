-- ════════════════════════════════════════════
-- 061_member_attendance_rate_nick_name.sql
-- member_attendance_rate view 補上 nick_name（英文名），儀表板「需關懷社友」
-- 這輪要跟中文姓名一起顯示，原本這個 view 只有 r.name。
-- ════════════════════════════════════════════

DROP VIEW IF EXISTS member_attendance_rate;

CREATE VIEW member_attendance_rate
WITH (security_invoker = true)
AS
SELECT
  ad.club_id,
  ad.member_id,
  r.name AS member_name,
  r.nick_name AS member_nick_name,
  COUNT(*) FILTER (WHERE ad.status != 'exempt') AS counted,
  COUNT(*) FILTER (WHERE ad.status = 'present') AS present,
  COUNT(*) FILTER (WHERE ad.status = 'absent') AS absent,
  COUNT(*) FILTER (WHERE ad.status = 'leave') AS leave,
  ROUND(
    COUNT(*) FILTER (WHERE ad.status = 'present')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE ad.status != 'exempt'), 0) * 100,
    1
  ) AS rate
FROM attendance_details ad
JOIN roster r ON r.id = ad.member_id
GROUP BY ad.club_id, ad.member_id, r.name, r.nick_name;
