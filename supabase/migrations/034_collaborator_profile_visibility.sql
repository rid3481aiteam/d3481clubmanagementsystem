-- ════════════════════════════════════════════
-- 034_collaborator_profile_visibility.sql
-- 修補 033 的疏漏：club_id = current_club_id() 的社長/執秘
-- 目前完全看不到「跨社協作帳號」的姓名/啟用狀態。
--
-- 根因：user_profiles 的既有 SELECT policy（profiles_select_own /
-- profiles_select_club）只放行「自己」或「home club 剛好是目前這個社
-- 的人」，被授權跨社協作的人 home club 在別的社，這兩條都擋住。
-- 這裡加一條：只要對方在 user_club_roles 裡有一筆指向目前這個社的
-- 有效授權，該社的社長/執秘就能讀到對方的 user_profiles（姓名/啟用
-- 狀態），不會看到跟本社無關的其他欄位以外資訊——RLS 是逐列擋，不是
-- 逐欄，但這條 policy 本身不會讓對方看到「你」的 profile，只單向。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_select_collaborator" ON user_profiles;
CREATE POLICY "profiles_select_collaborator" ON user_profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_club_roles ucr
    WHERE ucr.user_id = user_profiles.id
      AND ucr.club_id = current_club_id()
      AND is_club_tier()
  )
);
