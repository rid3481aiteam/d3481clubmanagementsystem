-- ════════════════════════════════════════════
-- 025_self_registration.sql
-- 開放使用者自助註冊：email + 選社 + 職稱 + 密碼，
-- 註冊後一律先給最低權限 club_member，職稱僅存成 requested_role
-- 供地區管理員在「帳號管理」頁決定是否手動升級為社長／執秘。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS requested_role user_role;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, club_id, name, role, requested_role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'club_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'club_member'::public.user_role),
    (NEW.raw_user_meta_data->>'requested_role')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 註冊頁的社團下拉選單在使用者登入前就要顯示，
-- 但 clubs_select policy 只開放給 authenticated，所以另開一個
-- 只回傳 id/name 的 SECURITY DEFINER function 給 anon 用，
-- 不直接對 anon 開放 clubs 整張表（避免洩漏社長/執秘聯絡資訊）。
CREATE OR REPLACE FUNCTION public_clubs_for_registration()
RETURNS TABLE(id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name FROM clubs ORDER BY sort_order;
$$;

GRANT EXECUTE ON FUNCTION public_clubs_for_registration() TO anon, authenticated;
