-- ════════════════════════════════════════════
-- 065_log_pending_approval.sql
-- 「帳號審核」核准待審申請人（activatePending，涵蓋一般社友申請、
-- 社帳號申請兩種）一直沒有寫進 invite_log，導致「授權紀錄」表格
-- 只看得到「帳號權限授予」（invite-user Edge Function 的
-- grant_type=club 那條路）留下的舊紀錄，看不到最常用的審核通過動作。
--
-- 改用 trigger 補齊，不在每個呼叫端（activatePendingAccount／
-- activateClubApplication）各自手動加一段寫入邏輯——分散在多處容易漏，
-- 這次的落差就是證明。只認「OLD.requested_role 有值、NEW.requested_role
-- 被清空」這個轉換，這正是 activatePending() 唯一會做的事，不會誤觸
-- 帳號總覽單純切換權限（approveRole）那種 requested_role 本來就是
-- NULL 的更新。
--
-- 只往前生效，不補歷史——已經核准過的舊帳號沒有可靠的「核准當下」
-- 時間點可以回填（updated_at 會被其他操作一起更新，回填會失真）。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_pending_account_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF OLD.requested_role IS NOT NULL AND NEW.requested_role IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    INSERT INTO invite_log (invited_by, invited_email, club_id, role, accepted_at)
    VALUES (auth.uid(), COALESCE(v_email, NEW.name), NEW.club_id, NEW.role, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_pending_account_approval_trigger ON user_profiles;
CREATE TRIGGER log_pending_account_approval_trigger
  AFTER UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION log_pending_account_approval();
