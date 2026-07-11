-- 050_gg_cases.sql
-- GG案盤點（全球獎助金），比照 vivian 檔案（rotary3481_platform_12.html 的 p-gg）：
-- 追蹤本社發起或參與的 Global Grant 專案，重點是案件狀態與到期風險。
-- RLS 比照 049_iou.sql，寫入限本社 club_admin/club_secretary，全社友可查看。

CREATE TABLE gg_cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name           text NOT NULL,
  partner        text,            -- 國際夥伴社
  amount         text,            -- 申請金額，保留原幣別格式（如 US$30,000）
  start_date     date,
  end_date       date,
  status         text NOT NULL DEFAULT '規劃中' CHECK (status IN ('規劃中', '申請中', '進行中', '已完成', '取消')),
  description    text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gg_cases_name_present CHECK (length(trim(name)) > 0)
);

CREATE INDEX gg_cases_club_idx
  ON gg_cases (club_id, end_date);

ALTER TABLE gg_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gg_cases_select" ON gg_cases
  FOR SELECT TO authenticated USING (club_id = current_club_id() OR is_district_admin());

CREATE POLICY "gg_cases_insert" ON gg_cases
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "gg_cases_update" ON gg_cases
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "gg_cases_delete" ON gg_cases
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER gg_cases_updated_at
  BEFORE UPDATE ON gg_cases
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
