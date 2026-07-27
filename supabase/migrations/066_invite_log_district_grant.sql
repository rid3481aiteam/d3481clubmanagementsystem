-- ════════════════════════════════════════════
-- 066_invite_log_district_grant.sql
-- 「授予地區工作人員權限」（invite-user 的 grant_type='district'）從來
-- 沒有寫進 invite_log，因為這條路徑授予的是 district_role（'view'/
-- 'admin'），跟 invite_log.role 這個 user_role enum（district_admin/
-- club_admin/club_secretary/club_member）代表的「這個人在自己社的
-- 角色」是兩件不同的事，硬塞進去只會失真（例如統一寫 district_admin，
-- 「唯讀」跟「編輯」授權就分不出來了）。
--
-- 改成新增一個獨立、互斥的 district_role 欄位：role 放寬成可以是
-- NULL，每一筆紀錄一定「有 role 沒 district_role」或「有 district_role
-- 沒 role」，不會兩者都空或都有。
-- ════════════════════════════════════════════

ALTER TABLE invite_log ALTER COLUMN role DROP NOT NULL;

ALTER TABLE invite_log
  ADD COLUMN IF NOT EXISTS district_role text CHECK (district_role IN ('view', 'admin'));

ALTER TABLE invite_log
  ADD CONSTRAINT invite_log_grant_kind_check
  CHECK ((role IS NOT NULL) <> (district_role IS NOT NULL));
