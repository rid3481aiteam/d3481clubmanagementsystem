-- ════════════════════════════════════════════
-- 053_activity_registration_decline.sql
-- 活動/例會報名新增「不克參加」狀態：原本 status 只有
-- registered/cancelled，無法區分「主動回覆不克參加」跟「還沒回覆」，
-- 主辦社統計時看不出誰已讀未回。改成可重複執行（先 DROP 再 ADD）。
--
-- form_data 本身是 jsonb，來賓改成結構化的 guests: [{name, company}]
-- 陣列（取代原本單純的數字 guest_count），不用改欄位，前端型別調整即可。
-- ════════════════════════════════════════════

ALTER TABLE activity_registrations DROP CONSTRAINT IF EXISTS activity_registrations_status_check;
ALTER TABLE activity_registrations ADD CONSTRAINT activity_registrations_status_check
  CHECK (status IN ('registered', 'cancelled', 'declined'));
