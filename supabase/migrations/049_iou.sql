-- 049_iou.sql
-- IOU（捐獻收據追蹤），比照 vivian 檔案（rotary3481_platform_12.html 的 p-iou）：
-- 追蹤社友針對社務/活動/服務計畫等的「非社費捐獻」，重點是收據是否已開立給捐款人。
-- RLS 比照 048_club_todos.sql，寫入限本社 club_admin/club_secretary，全社友可查看。

CREATE TABLE iou_receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  donor_name     text NOT NULL,
  item           text NOT NULL,   -- 社務捐獻/活動贊助/服務計畫捐獻/慈善捐款/獎助學金/設備物資/其他
  amount         integer NOT NULL CHECK (amount > 0),
  donation_date  date NOT NULL,
  receipt_payee  text,            -- 收據抬頭，可能跟捐款人姓名不同（如公司行號）
  status         text NOT NULL DEFAULT '待開立' CHECK (status IN ('待開立', '已開立')),
  note           text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iou_receipts_donor_name_present CHECK (length(trim(donor_name)) > 0)
);

CREATE INDEX iou_receipts_club_idx
  ON iou_receipts (club_id, donation_date DESC);

ALTER TABLE iou_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iou_receipts_select" ON iou_receipts
  FOR SELECT TO authenticated USING (club_id = current_club_id() OR is_district_admin());

CREATE POLICY "iou_receipts_insert" ON iou_receipts
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "iou_receipts_update" ON iou_receipts
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "iou_receipts_delete" ON iou_receipts
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER iou_receipts_updated_at
  BEFORE UPDATE ON iou_receipts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
