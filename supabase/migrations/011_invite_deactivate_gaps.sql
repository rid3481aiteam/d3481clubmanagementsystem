-- ════════════════════════════════════════════
-- 011_invite_deactivate_gaps.sql
-- 補上 district_admin 管理 user_profiles 的 UPDATE 權限，
-- 讓地區管理員可以停用/啟用執秘帳號（目前完全沒有這個能力）。
-- ════════════════════════════════════════════

-- is_district_admin() 是 SECURITY DEFINER（009 已修復），用在 user_profiles 自己的
-- policy 裡正是 009 設計成安全的那種形狀：函式內部查 user_profiles 時以 function owner
-- 身分執行、略過 RLS，不會重新觸發這條 policy 本身，因此不會遞迴。
CREATE POLICY "profiles_district_admin_manage" ON user_profiles
  FOR UPDATE TO authenticated USING (
    is_district_admin()
  ) WITH CHECK (
    is_district_admin()
  );
