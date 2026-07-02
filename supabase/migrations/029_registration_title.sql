-- ════════════════════════════════════════════
-- 029_registration_title.sql
-- 自助註冊頁的「職稱」改成扶輪社常見職稱代碼
-- （DG/DS/DA/VDS/AG/VAG/CP/PP/P/PE/VP/S/RTN），
-- 這些職稱比 user_role 這個系統權限 enum 細很多、也對不起來，
-- 所以另外存一個純文字欄位 requested_title 給地區/各社管理員審核時參考，
-- 不影響既有 requested_role（審核時要給哪個系統角色，還是由管理員決定）。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS requested_title text;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, club_id, name, role, requested_role, requested_title)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'club_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'club_member'::public.user_role),
    (NEW.raw_user_meta_data->>'requested_role')::public.user_role,
    NEW.raw_user_meta_data->>'requested_title'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
