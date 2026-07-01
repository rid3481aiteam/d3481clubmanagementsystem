-- ════════════════════════════════════════════
-- 008_fix_handle_new_user_search_path.sql
-- 修復 handle_new_user() 因缺少 search_path 導致
-- 「type user_role does not exist」的建立/邀請使用者失敗問題
-- ════════════════════════════════════════════

-- SECURITY DEFINER function 不會繼承呼叫端的 search_path，
-- auth 服務觸發此 trigger 時的 session search_path 不含 public，
-- 導致未加 schema 前綴的 user_role enum 找不到。
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, club_id, name, role)
  VALUES (
    NEW.id,
    (NEW.raw_app_meta_data->>'club_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_app_meta_data->>'role')::public.user_role, 'club_member'::public.user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
