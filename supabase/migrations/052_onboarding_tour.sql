-- ════════════════════════════════════════════
-- 052_onboarding_tour.sql
-- 首次登入導覽：新增 onboarding_completed_at 記錄「這個帳號是否已經
-- 看過（或略過）新手導覽」，前端用 IS NULL 判斷要不要自動彈出。
--
-- 既有帳號一律視為已完成，避免導覽對已經在用平台的社友重複彈出，
-- 只有 052 之後新建立的帳號（handle_new_user 預設 NULL）才會看到。
-- 更新沿用既有的 profiles_update_own policy（本人可寫自己），不需要
-- 額外的 RLS 或 protect_user_profile_privileged_fields 例外。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

UPDATE user_profiles
SET onboarding_completed_at = now()
WHERE onboarding_completed_at IS NULL;
