-- ════════════════════════════════════════════
-- 051_rotarysso.sql
-- 接入 RotarySSO（扶輪生態系共用 OIDC 身分中心），完全取代帳密登入。
--
-- sso_sub 是 RotarySSO 的 sub claim，跨系統永久識別鍵，一個帳號一輩子
-- 只會對到一個 sso_sub（見 sso-login Edge Function 的比對邏輯）。
-- sso_account_type／sso_rotary_club／sso_rotary_district 純粹是資訊
-- 欄位，給地區管理員審核「帳號審核」清單時參考用，不用來自動比對
-- club_id（使用者明確要求：一律待審，不自動用社名文字比對 clubs.name）。
--
-- handle_new_user() 沿用 029_registration_title.sql 的版本再加這幾欄；
-- account_type='管理者'（RotarySSO 全域系統管理者，跟 D3481 地區角色
-- 是兩回事）比照使用者決策，首次登入直接授予 district_role='admin'。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sso_sub text UNIQUE,
  ADD COLUMN IF NOT EXISTS sso_account_type text,
  ADD COLUMN IF NOT EXISTS sso_rotary_club text,
  ADD COLUMN IF NOT EXISTS sso_rotary_district text;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, club_id, name, role, requested_role, requested_title,
    sso_sub, sso_account_type, sso_rotary_club, sso_rotary_district, district_role
  )
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'club_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'club_member'::public.user_role),
    (NEW.raw_user_meta_data->>'requested_role')::public.user_role,
    NEW.raw_user_meta_data->>'requested_title',
    NEW.raw_user_meta_data->>'sso_sub',
    NEW.raw_user_meta_data->>'sso_account_type',
    NEW.raw_user_meta_data->>'sso_rotary_club',
    NEW.raw_user_meta_data->>'sso_rotary_district',
    CASE WHEN NEW.raw_user_meta_data->>'sso_account_type' = '管理者' THEN 'admin' ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
