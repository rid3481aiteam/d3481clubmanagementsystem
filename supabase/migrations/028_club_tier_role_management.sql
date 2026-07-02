-- ════════════════════════════════════════════
-- 028_club_tier_role_management.sql
-- 開放社長／執秘在「帳號管理」頁編輯本社帳號的角色，
-- 不用每次都要地區管理員代勞（常見情境：核准自助註冊帳號的職稱）。
--
-- 024 的 protect_user_profile_privileged_fields() 原本只要動到 role
-- 就一律要求 is_district_admin()。這裡放寬成：本社角色互轉
-- （club_admin/club_secretary/club_member 三者之間）club_admin／
-- club_secretary 也能做，但仍限制在自己的社（current_club_id()）；
-- club_id、district_access 這兩個欄位維持原樣，只有地區管理員能改。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_user_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.club_id::text, '') <> COALESCE(OLD.club_id::text, '')
    OR NEW.district_access IS DISTINCT FROM OLD.district_access
  THEN
    IF NOT is_district_admin() THEN
      RAISE EXCEPTION '沒有權限變更帳號所屬社團或地區權限';
    END IF;
  END IF;

  IF COALESCE(NEW.role::text, '') <> COALESCE(OLD.role::text, '') THEN
    IF NOT (
      is_district_admin()
      OR (
        is_club_tier()
        AND OLD.club_id = current_club_id()
        AND OLD.role IN ('club_admin', 'club_secretary', 'club_member')
        AND NEW.role IN ('club_admin', 'club_secretary', 'club_member')
      )
    ) THEN
      RAISE EXCEPTION '沒有權限變更帳號角色';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
