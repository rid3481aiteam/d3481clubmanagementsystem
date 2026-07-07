-- ════════════════════════════════════════════
-- 038_line_notifications.sql
-- LINE 官方帳號通知 Demo（Phase 3 的第一步，先讓和平社實際看到可行）：
--
-- 使用者這輪明確表示：這一步的重點是「證明這個功能做得到」，
-- 安全性（例如冒用他人手機號碼綁定）之後正式導入前再另外處理，
-- 所以這裡刻意選最簡單能動的做法——人工核對版綁定，不做
-- LINE Login OAuth（那個要另外申請一個 LINE Login 頻道，門檻較高）。
--
-- 流程：社友加 OA 好友 → 傳訊息（自己的手機號碼）→ webhook 收到後比對
-- 該社 roster 的 phone/personal_phone → 比對成功寫入 line_bindings 並
-- 回覆確認。之後社管理員可以對「已綁定的人」發送測試/通知訊息。
-- ════════════════════════════════════════════

-- ── club_notification_channels：每社的 LINE OA 串接設定 ──
-- Messaging API 的 Channel Secret / Channel Access Token 由該社執秘/社長
-- 在 LINE Developers Console 申請後手動貼上來，這裡先明碼存放（RLS 限本社
-- 管理員 + 地區管理員才能讀寫），正式大規模推廣前應該加密或搬到 Vault。
CREATE TABLE club_notification_channels (
  club_id                    uuid PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  line_channel_secret        text,
  line_channel_access_token  text,
  status                     text NOT NULL DEFAULT 'pending_manual_setup' CHECK (status IN ('connected', 'pending_manual_setup')),
  updated_by                 uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE club_notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_channels_select" ON club_notification_channels FOR SELECT TO authenticated USING (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
);
CREATE POLICY "notification_channels_write" ON club_notification_channels FOR ALL TO authenticated USING (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
) WITH CHECK (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
);

CREATE TRIGGER notification_channels_updated_at
  BEFORE UPDATE ON club_notification_channels FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── line_bindings：社友 LINE 帳號 <-> 名冊手機號碼的綁定紀錄 ──
-- roster_id 可能是 NULL（例如綁定後名冊那筆被刪除），保留 member_name/phone
-- 快照方便追查是誰、什麼時候綁的。
CREATE TABLE line_bindings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  roster_id     uuid REFERENCES roster(id) ON DELETE SET NULL,
  member_name   text NOT NULL,
  phone         text NOT NULL,
  line_user_id  text NOT NULL UNIQUE,
  bound_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX line_bindings_club_idx ON line_bindings (club_id);

ALTER TABLE line_bindings ENABLE ROW LEVEL SECURITY;

-- 只有本社管理員/地區管理員能查看已綁定名單；沒有給前端的寫入 policy，
-- 只有 webhook（用 service role，略過 RLS）能寫入，避免使用者自己塞資料進來冒充綁定。
CREATE POLICY "line_bindings_select" ON line_bindings FOR SELECT TO authenticated USING (
  (club_id = current_club_id() AND is_club_tier()) OR is_district_admin()
);
