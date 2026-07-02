-- ════════════════════════════════════════════
-- 025_member_phone_accounts.sql
-- 開放一般社員（club_member）帳號：用手機號碼登入，不走 email 邀請流程。
--
-- user_profiles 新增 phone 欄位（唯一），社員帳號由社長／執秘在後台
-- 直接建立（Edge Function 用 service role 呼叫 admin.createUser，
-- email 欄位放合成信箱 <phone>@member.d3481.local，使用者完全不需碰 email）。
--
-- 012 的 profiles_club_tier_manage 只放行更新 role 為 club_admin/club_secretary
-- 的列，社長／執秘無法停用/啟用社員帳號，這裡放寬到 club_member。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone text UNIQUE;

DROP POLICY IF EXISTS "profiles_club_tier_manage" ON user_profiles;
CREATE POLICY "profiles_club_tier_manage" ON user_profiles
  FOR UPDATE TO authenticated USING (
    club_id = current_club_id()
    AND role IN ('club_admin', 'club_secretary', 'club_member')
    AND is_club_tier()
  )
  WITH CHECK (
    club_id = current_club_id()
    AND role IN ('club_admin', 'club_secretary', 'club_member')
  );
