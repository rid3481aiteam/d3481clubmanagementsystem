-- ════════════════════════════════════════════
-- 012_club_self_manage_accounts.sql
-- 權限模型簡化為三層：地區（全區檢視、不編輯各社資料）／
-- 各社（社長與執秘對等，全權編輯本社資料並自行管理本社帳號）／一般人（唯讀，Phase 2 再做）。
--
-- 這支只處理「各社帳號自管」：把 006 的單向 policy
-- （執秘可管理社長）換成對稱 policy（社長／執秘互相都能管理對方，
-- 僅限同一社），呼應 invite-user Edge Function 同步放寬的邀請邏輯。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_secretary_manage_admin" ON user_profiles;

-- is_club_tier()：跟 009 修復的其他 helper function 一樣，
-- 用在 user_profiles 自己的 policy 裡，必須是 SECURITY DEFINER 才不會遞迴。
CREATE OR REPLACE FUNCTION is_club_tier()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role IN ('club_admin', 'club_secretary') FROM user_profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_club_tier_manage" ON user_profiles
  FOR UPDATE TO authenticated USING (
    club_id = current_club_id()
    AND role IN ('club_admin', 'club_secretary')
    AND is_club_tier()
  )
  WITH CHECK (
    club_id = current_club_id()
    AND role IN ('club_admin', 'club_secretary')
  );
