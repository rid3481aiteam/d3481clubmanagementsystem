-- ════════════════════════════════════════════
-- 013_invite_log_club_tier_select.sql
-- 修正 007 的 invite_log_select policy：原本只有 is_club_secretary()
-- 能看本社邀請紀錄，club_admin 完全看不到，跟這次「社長執秘對等」
-- 的權限模型不一致（各社自行管理帳號，兩者應該都要看得到本社紀錄）。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "invite_log_select" ON invite_log;

CREATE POLICY "invite_log_select" ON invite_log
  FOR SELECT TO authenticated USING (
    is_district_admin()
    OR (club_id = current_club_id() AND is_club_tier())
  );
