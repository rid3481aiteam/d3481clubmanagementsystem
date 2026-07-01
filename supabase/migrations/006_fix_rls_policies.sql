-- ════════════════════════════════════════════
-- 006_fix_rls_policies.sql
-- 補強 RLS：執秘可邀請/停用社長帳號
-- ════════════════════════════════════════════

-- helper：判斷是否為執秘
CREATE OR REPLACE FUNCTION is_club_secretary()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT role = 'club_secretary' FROM user_profiles WHERE id = auth.uid();
$$;

-- 執秘可讀本社所有 user_profiles（包含社長帳號）
CREATE POLICY "profiles_select_club" ON user_profiles
  FOR SELECT TO authenticated USING (
    club_id = current_club_id()
    AND (is_club_secretary() OR
         (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'club_admin')
  );

-- 執秘可更新本社 club_admin 的 is_active（停用/啟用社長帳號）
CREATE POLICY "profiles_secretary_manage_admin" ON user_profiles
  FOR UPDATE TO authenticated USING (
    club_id = current_club_id()
    AND is_club_secretary()
    AND role = 'club_admin'
  )
  WITH CHECK (
    club_id = current_club_id()
    AND role = 'club_admin'
  );
