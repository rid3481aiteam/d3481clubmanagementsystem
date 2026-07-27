-- ════════════════════════════════════════════
-- 069_sso_account_notifications.sql
-- 接收 RotarySSO 帳戶事件通知（account.registered/approved/rejected）的落地表。
--
-- 對接規格見「SSO 帳戶事件通知 對接規格 v1」第 5 節。sso_pending_account
-- 以 sso_sub 為主鍵做 upsert（同一人重複核准只更新這一列，不會生出第二筆
-- ——SSO 端允許管理者對同一帳戶重複執行核准，每次都是新的 event_id，見
-- 規格 4.2 節）。sso_event_log 是事件層級的去重表（同一次通知重試會帶
-- 同一個 event_id）。
--
-- 這兩張表只給 sso-account-webhook Edge Function（service role）寫入，
-- 不開放 authenticated 角色 INSERT/UPDATE，比照 invite_log／activity_log
-- 「寫入只透過受控管道」的既有慣例。
--
-- user_profiles 新增 sso_verified_at：webhook 收到 account.approved、或
-- 使用者稍後登入時，會把這個核准事件裡「已通過 SSO 管理者查驗」的扶輪
-- 社／地區／身分別資料覆蓋進 user_profiles 對應欄位，並記錄這個時間戳
-- ——只用來在「帳號審核」畫面標示「SSO 已核准」，社別／角色指派仍維持
-- 既有人工比對流程不變（使用者明確決定不自動比對 club_id，避免比對
-- 錯誤悄悄把人分到錯的社，跟這幾輪一直在調整的 clubMatch.ts 是兩件事）。
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sso_pending_account (
  sso_sub           text PRIMARY KEY,
  status            text NOT NULL CHECK (status IN ('registered', 'approved', 'rejected')),
  last_event_id     text NOT NULL,
  last_occurred_at  timestamptz NOT NULL,
  email             text NOT NULL,
  name              text,
  rotary_district   text,
  rotary_club       text,
  account_type      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  consumed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS sso_pending_account_status_idx ON sso_pending_account (status);

CREATE TABLE IF NOT EXISTS sso_event_log (
  event_id     text PRIMARY KEY,
  received_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sso_pending_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_event_log ENABLE ROW LEVEL SECURITY;

-- 目前沒有對應 UI，先開放地區管理員查詢方便未來除錯／排查孤兒記錄。
-- 沒有 INSERT/UPDATE/DELETE policy，一律只能透過 service role 的
-- Edge Function 寫入，authenticated 角色連自己都寫不進去。
DROP POLICY IF EXISTS "sso_pending_account_select" ON sso_pending_account;
CREATE POLICY "sso_pending_account_select" ON sso_pending_account FOR SELECT TO authenticated USING (
  is_district_admin()
);

-- sso_event_log 純粹是內部去重用，沒有對應 SELECT policy——RLS 開啟但
-- 沒有任何 policy，等於只有 service role 摸得到，authenticated 完全看不到。

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sso_verified_at timestamptz;
