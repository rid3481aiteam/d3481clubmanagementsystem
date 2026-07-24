-- ════════════════════════════════════════════
-- 063_district_pending_notify_specific_recipient.sql
-- 使用者澄清：新帳號待審核通知不用發給「所有地區權限＝編輯」的人，
-- 用地區的 Gmail 直接發給指定收件人就好，比 062 一開始做的
-- district_admin_emails() 動態查詢簡單。
--
-- 拿掉 062 新增的 district_admin_emails()（不再使用），
-- district_notification_channel 新增 notify_to 欄位存指定收件人
-- （可填多個 Email，用逗號分隔），地區管理員在設定頁自己填，
-- 不用系統另外判斷「誰是地區管理員」。
-- ════════════════════════════════════════════

DROP FUNCTION IF EXISTS district_admin_emails();

ALTER TABLE district_notification_channel
  ADD COLUMN IF NOT EXISTS notify_to text;
