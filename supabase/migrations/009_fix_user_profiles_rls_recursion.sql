-- ════════════════════════════════════════════
-- 009_fix_user_profiles_rls_recursion.sql
-- 修復 user_profiles RLS 造成的 infinite recursion
--
-- 根因：current_club_id() / is_district_admin() / is_club_secretary()
-- 都是一般 SQL function（非 SECURITY DEFINER），內部會查詢 user_profiles。
-- 當這些 function（或直接寫在 policy 裡的子查詢）被用在
-- user_profiles 自己的 RLS policy 中時，內部查詢又要重新套用
-- user_profiles 的 RLS，形成無窮遞迴（Postgres 42P17）。
--
-- 修法：把這些 helper function 改成 SECURITY DEFINER，
-- 讓它們以 function owner（略過 RLS）的身分執行內部查詢，
-- 並把 policy 裡直接寫的子查詢改為呼叫 function。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION current_club_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_district_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role = 'district_admin' FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_club_secretary()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role = 'club_secretary' FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- 重建 user_profiles 的 policy，改用 function 而非直接子查詢
DROP POLICY IF EXISTS "profiles_select_own" ON user_profiles;
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid() OR is_district_admin()
  );

DROP POLICY IF EXISTS "profiles_select_club" ON user_profiles;
CREATE POLICY "profiles_select_club" ON user_profiles
  FOR SELECT TO authenticated USING (
    club_id = current_club_id()
    AND (is_club_secretary() OR current_user_role() = 'club_admin')
  );
