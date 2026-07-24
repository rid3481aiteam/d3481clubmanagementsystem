-- ════════════════════════════════════════════
-- 062_district_pending_account_notify.sql
-- 有人透過 RotarySSO 首次登入、產生待審核帳號時，比照 057/058 的
-- 「例會自動發信通知社友」做法，用 Gmail + 應用程式密碼寄信通知地區
-- 管理員，不用自己點進「帳號管理」頁才發現有人在等審核。
--
-- 這是地區層級的通知（收件人是所有 district_role = 'admin' 的人），
-- 不是哪個社的事，不能沿用 club_notification_channels（club_id 是
-- NOT NULL 外鍵指到 clubs，沒有一列代表「地區辦公室」），另開一張
-- 單列表存地區共用的寄件 Gmail 帳號。
--
-- 新功能一律先包 feature flag、預設關閉，地區管理員自己到「功能開關
-- 管理」評估、設定好 Gmail 帳密後再打開，避免還沒準備好就誤觸發送
-- （比照 J1_line_notify／K1_meeting_email_notify 的既有慣例）。
-- ════════════════════════════════════════════

CREATE TABLE district_notification_channel (
  id                 text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  email_from         text,
  email_app_password text,
  updated_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO district_notification_channel (id)
SELECT 'default'
WHERE NOT EXISTS (SELECT 1 FROM district_notification_channel WHERE id = 'default');

ALTER TABLE district_notification_channel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_notification_channel_select" ON district_notification_channel FOR SELECT TO authenticated USING (
  is_district_admin()
);
CREATE POLICY "district_notification_channel_write" ON district_notification_channel FOR UPDATE TO authenticated USING (
  is_district_admin()
) WITH CHECK (
  is_district_admin()
);

CREATE TRIGGER district_notification_channel_updated_at
  BEFORE UPDATE ON district_notification_channel FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO feature_flags (club_id, feature_key, enabled)
SELECT NULL, 'M1_pending_account_notify', false
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE club_id IS NULL AND feature_key = 'M1_pending_account_notify'
);

-- ── district_admin_emails：給 sso-login Edge Function 用 service_role 查詢
-- 通知收件人（所有「地區權限＝編輯」的帳號）。比照 find_user_id_by_email
-- 的做法：只給 service_role 執行，避免變成 email 列舉工具；user_profiles
-- 沒有存 email（在 auth.users），這裡跨 schema 查一次回傳陣列。
CREATE OR REPLACE FUNCTION district_admin_emails()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT au.email), ARRAY[]::text[])
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE (up.role = 'district_admin' OR up.district_role = 'admin')
    AND up.is_active
    AND au.email IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION district_admin_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION district_admin_emails() TO service_role;
