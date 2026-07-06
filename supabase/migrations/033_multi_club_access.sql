-- ════════════════════════════════════════════
-- 033_multi_club_access.sql
-- 支援單一帳號跨社管理：一個人可以是 A 社的 home 帳號，
-- 同時被和平社（或其他社）授權管理員/執秘身分，不需要
-- 用第二個 Email 重新申請帳號。
--
-- 設計：home club 維持在 user_profiles.club_id/role 不動，
-- 新增 user_club_roles 記錄「額外」被授權的社+角色。
-- current_club_id()/current_user_role() 這兩個 helper function
-- 已被 20+ 個 migration 的 RLS policy 呼叫，這裡改成
-- 「依 active_club_id 決定現在檢視哪個社」後，其餘 policy
-- 全部自動生效，不用逐一修改。
-- ════════════════════════════════════════════

-- ── user_club_roles（跨社協作授權）───────────────────
CREATE TABLE IF NOT EXISTS user_club_roles (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role       user_role NOT NULL CHECK (role IN ('club_admin', 'club_secretary', 'club_member')),
  is_active  boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS active_club_id uuid REFERENCES clubs(id);

ALTER TABLE user_club_roles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS user_club_roles_updated_at ON user_club_roles;
CREATE TRIGGER user_club_roles_updated_at
  BEFORE UPDATE ON user_club_roles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── helper functions（先於 policy 定義，供下面 is_club_tier() 依賴前就緒）──

-- current_club_id()：改成「目前選擇檢視的社」，預設 = home club，
-- 只有在切到跨社協作的社時才會不同
CREATE OR REPLACE FUNCTION current_club_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(active_club_id, club_id) FROM user_profiles WHERE id = auth.uid();
$$;

-- current_user_role()：如果目前檢視的是 home club，維持原本 role；
-- 如果是跨社協作的社，改查 user_club_roles 裡對那個社的授權角色
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN up.active_club_id IS NULL OR up.active_club_id = up.club_id THEN up.role
    ELSE (
      SELECT ucr.role FROM user_club_roles ucr
      WHERE ucr.user_id = up.id AND ucr.club_id = up.active_club_id AND ucr.is_active
    )
  END
  FROM user_profiles up WHERE up.id = auth.uid();
$$;

-- is_club_tier()：原本直接查 user_profiles.role，改成透過
-- current_user_role()，才會吃到「現在檢視的是哪個社」
CREATE OR REPLACE FUNCTION is_club_tier()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() IN ('club_admin', 'club_secretary');
$$;

-- is_club_secretary()：同上，改走 current_user_role()
CREATE OR REPLACE FUNCTION is_club_secretary()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() = 'club_secretary';
$$;

-- ── user_club_roles 的 RLS ────────────────────────────
-- SELECT：本人看自己被授權去哪些社（切換用）；該社管理員看自己社的協作名單；地區管理員看全部
DROP POLICY IF EXISTS "user_club_roles_select" ON user_club_roles;
CREATE POLICY "user_club_roles_select" ON user_club_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR (club_id = current_club_id() AND is_club_tier())
  OR is_district_admin()
);

-- write：只有該社（目前檢視中）的社長/執秘能新增/調整/撤銷自己社的協作授權；地區管理員可代管
DROP POLICY IF EXISTS "user_club_roles_write" ON user_club_roles;
CREATE POLICY "user_club_roles_write" ON user_club_roles FOR ALL TO authenticated USING (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
) WITH CHECK (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
);

-- ── club_officers_write（018）唯一還在內嵌 role 檢查、沒有走 helper function 的 policy ──
DROP POLICY IF EXISTS "club_officers_write" ON club_officers;
CREATE POLICY "club_officers_write" ON club_officers FOR ALL TO authenticated USING (
  club_id = current_club_id() AND is_club_tier()
);

-- ── active_club_id 的寫入保護 ─────────────────────────
-- 只能切回 NULL（home）、切成自己的 home club_id，或切到自己在
-- user_club_roles 裡有效授權的社，避免直接改 table 偽造成別的社視角
CREATE OR REPLACE FUNCTION protect_user_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.club_id::text, '') <> COALESCE(OLD.club_id::text, '')
    OR NEW.district_role IS DISTINCT FROM OLD.district_role
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

  IF NEW.active_club_id IS DISTINCT FROM OLD.active_club_id AND NEW.active_club_id IS NOT NULL THEN
    IF NOT (
      NEW.active_club_id = NEW.club_id
      OR EXISTS (
        SELECT 1 FROM user_club_roles
        WHERE user_id = NEW.id AND club_id = NEW.active_club_id AND is_active
      )
    ) THEN
      RAISE EXCEPTION '沒有權限切換到這個社';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── find_user_id_by_email：給 invite-user Edge Function 用 service_role 判斷
-- 這個 email 是否已經有帳號。只給 service_role 執行，避免變成 email 探測工具。
CREATE OR REPLACE FUNCTION find_user_id_by_email(p_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION find_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION find_user_id_by_email(text) TO service_role;
