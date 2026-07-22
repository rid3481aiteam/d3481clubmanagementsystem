-- ════════════════════════════════════════════
-- 057_meeting_email_notify.sql
-- 新增例會後自動發信通知本社社友（K1_meeting_email_notify）。
-- 比照 J1_line_notify（056）的做法，預設關閉，地區管理員要到
-- 「功能開關管理」頁自己打開才會生效，避免還沒設定好
-- RESEND_API_KEY 之前就有人誤觸發送。
-- ════════════════════════════════════════════

INSERT INTO feature_flags (club_id, feature_key, enabled)
SELECT NULL, 'K1_meeting_email_notify', false
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE club_id IS NULL AND feature_key = 'K1_meeting_email_notify'
);
