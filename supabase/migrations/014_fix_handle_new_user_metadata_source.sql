-- ════════════════════════════════════════════
-- 014_fix_handle_new_user_metadata_source.sql
-- 修復 handle_new_user() 讀錯 metadata 欄位的問題。
--
-- inviteUserByEmail(email, { data: {...} }) 寫入的是
-- raw_user_meta_data，不是 raw_app_meta_data（Admin API 也沒有
-- 提供直接設定 app_metadata 的選項）。008 的版本讀 raw_app_meta_data，
-- 導致每次邀請新帳號 club_id 都是 NULL、role 都 fallback 成
-- club_member，帳號管理頁的「社長／執秘帳號」表格看不到剛邀請的人。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, club_id, name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'club_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'club_member'::public.user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
