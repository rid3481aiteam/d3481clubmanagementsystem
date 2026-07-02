-- ════════════════════════════════════════════
-- 024_user_profile_district_access.sql
-- 允許同一個帳號保留本社角色（如社長），同時開通地區管理權限。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS district_access boolean NOT NULL DEFAULT false;

UPDATE user_profiles
SET district_access = true
WHERE role = 'district_admin';

CREATE OR REPLACE FUNCTION is_district_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
      AND (role = 'district_admin' OR district_access)
  );
$$;

DROP POLICY IF EXISTS "clubs_write" ON clubs;
CREATE POLICY "clubs_write" ON clubs
  FOR ALL TO authenticated USING (is_district_admin())
  WITH CHECK (is_district_admin());

CREATE OR REPLACE FUNCTION protect_user_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.role::text, '') <> COALESCE(OLD.role::text, '')
    OR COALESCE(NEW.club_id::text, '') <> COALESCE(OLD.club_id::text, '')
    OR NEW.district_access IS DISTINCT FROM OLD.district_access
  THEN
    IF NOT is_district_admin() THEN
      RAISE EXCEPTION '沒有權限變更帳號角色、所屬社團或地區權限';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_privileged_fields ON user_profiles;
CREATE TRIGGER protect_user_profile_privileged_fields
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_user_profile_privileged_fields();
