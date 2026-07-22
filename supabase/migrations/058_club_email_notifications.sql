-- ════════════════════════════════════════════
-- 058_club_email_notifications.sql
-- 比照 038 的 LINE 通知設定，讓每社用自己的 Gmail 帳號 + 應用程式
-- 密碼發送例會通知信（使用者確認要各社自己的 Gmail，不集中用單一
-- 交易型郵件服務帳號，避免全地區共用一組 Gmail 撞到每日寄信上限）。
--
-- 沿用既有的 club_notification_channels 這張表（同一列可以同時放
-- LINE 跟 Email 的設定），只新增兩個欄位，不動既有的 line_* 欄位
-- 跟 RLS。email_from 同時當 SMTP 帳號跟寄件人地址，
-- email_app_password 是 Google 帳號兩步驟驗證後產生的應用程式密碼
-- （不是 Gmail 登入密碼本身）。
--
-- 刻意不共用既有的 status 欄位判斷「Email 是否已設定」：
-- status 目前是 LINE 專用的連線狀態，如果 Email 設定也去改 status，
-- 會讓兩個功能互相干擾對方顯示的「已設定」狀態。前端改成直接看
-- email_from 是否有值來判斷。
-- ════════════════════════════════════════════

ALTER TABLE club_notification_channels
  ADD COLUMN IF NOT EXISTS email_from text,
  ADD COLUMN IF NOT EXISTS email_app_password text;
