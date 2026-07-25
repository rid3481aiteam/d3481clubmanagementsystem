-- ════════════════════════════════════════════
-- 064_club_account_notify_email.sql
-- 每個社「自己的官方帳號」第一次被核准成 club_secretary/club_admin 時，
-- 自動記下那個帳號的 Email，當作之後轉發「社友申請待審核」通知信的收件人。
--
-- 跟公開通訊錄用的 clubs.email 分開存（那是社自己編輯、給大家看的聯絡
-- 信箱，跟這裡「登入帳號本人的 Email」是兩件事，混在一起怕互相蓋掉）。
--
-- 只在該社還沒有記過 Email 時才寫入（只認第一次），不管是哪個流程把
-- 角色變成 club_secretary/club_admin（帳號審核的「啟動」、帳號總覽的
-- 權限切換、跨社協作授權皆有可能），都一律觸發判斷。user_profiles 沒有
-- 存 email（在 auth.users），trigger 用 SECURITY DEFINER 跨 schema 查一次，
-- 不需要開放前端讀取 auth.users，安全性風險最小。
-- ════════════════════════════════════════════

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS account_notify_email text;

CREATE OR REPLACE FUNCTION capture_club_notify_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  applicant_email text;
BEGIN
  IF NEW.club_id IS NOT NULL
     AND NEW.role IN ('club_admin', 'club_secretary')
     AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.club_id IS DISTINCT FROM NEW.club_id)
  THEN
    SELECT email INTO applicant_email FROM auth.users WHERE id = NEW.id;
    IF applicant_email IS NOT NULL THEN
      UPDATE clubs
      SET account_notify_email = applicant_email
      WHERE id = NEW.club_id AND account_notify_email IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_club_notify_email_trigger ON user_profiles;
CREATE TRIGGER capture_club_notify_email_trigger
  AFTER UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION capture_club_notify_email();
