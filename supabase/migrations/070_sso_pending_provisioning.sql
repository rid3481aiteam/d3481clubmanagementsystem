-- ════════════════════════════════════════════
-- 070_sso_pending_provisioning.sql
-- 讓地區管理員能在使用者「登入 D3481 之前」就先指派社別/角色，使用者
-- 完成 SSO 核准後第一次登入 D3481 時就能直接進入系統，不用再卡一次
-- 待審核（見 069 之後的討論：069 只做到「登入後標示 SSO 已核准」，
-- 這次進一步做到「登入前就先指派好」）。
--
-- provisioned_club_id／provisioned_role 是地區管理員在新的「SSO 已核准，
-- 尚未登入」清單裡填的預先指派決定。sso-login 建立全新帳號（case 3）時
-- 會讀這兩欄，有值就直接帶進 user_metadata：
--   - provisioned_role 有值（社帳號申請，地區直接決定角色）：
--     直接建立成 club_id=指派值、role=指派值，登入當下就是已核准帳號。
--   - provisioned_role 是 NULL、只有 provisioned_club_id（社友申請，
--     只轉交社別）：建立成 club_id=指派值、requested_role='club_member'，
--     等同現有 forwardToClub() 的效果，登入後還是會出現在該社自己的
--     「帳號審核」等該社決定最終角色——這是刻意保留的一道人工關卡，
--     不是漏做，使用者已確認「或是直接手動分配到各社由各社進行權限
--     編輯」這個路徑是允許的。
--   - 兩欄都是 NULL：維持原本行為，club_id 留空丟進待審核。
--
-- provisioned_role 限制在 club_secretary/club_member，不能直接指派
-- district_admin/club_admin，跟既有「帳號審核」畫面的角色下拉選項
-- 一致（見 AccountManagementView.vue 的 pendingRoleChoice）。
-- ════════════════════════════════════════════

ALTER TABLE sso_pending_account
  ADD COLUMN IF NOT EXISTS provisioned_club_id uuid REFERENCES clubs(id),
  ADD COLUMN IF NOT EXISTS provisioned_role text CHECK (provisioned_role IN ('club_secretary', 'club_member')),
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz;

-- 地區管理員在畫面上直接寫入預先指派決定（不透過 Edge Function）。
-- sso_pending_account 原本沒有給 authenticated 的 write policy，這裡
-- 只開放地區管理員，且只用得到這張表既有的欄位，不會動到 status/
-- last_event_id 等只有 webhook 該碰的欄位（沒有欄位層級限制，但地區
-- 管理員本來就是高權限角色，跟其他表的既有慣例一致）。
DROP POLICY IF EXISTS "sso_pending_account_update" ON sso_pending_account;
CREATE POLICY "sso_pending_account_update" ON sso_pending_account FOR UPDATE TO authenticated USING (
  is_district_admin()
) WITH CHECK (
  is_district_admin()
);
