-- 048_club_todos.sql
-- 儀表板「待辦提醒」小工具，比照 vivian 檔案（rotary3481_platform_12.html 的 CUSTOM_TODOS）：
-- 任務名稱＋說明（選填）＋截止日期（選填）＋緊急程度，做完直接刪除，不做「完成但保留」的狀態。
-- RLS 比照 032_club_history.sql，寫入限本社 club_admin/club_secretary，全社友可查看。

CREATE TABLE club_todos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title      text NOT NULL,
  sub        text,
  due_date   date,
  level      text NOT NULL DEFAULT 'navy' CHECK (level IN ('navy', 'gold', 'red')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_todos_title_present CHECK (length(trim(title)) > 0)
);

CREATE INDEX club_todos_club_idx
  ON club_todos (club_id, due_date);

ALTER TABLE club_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_todos_select" ON club_todos
  FOR SELECT TO authenticated USING (club_id = current_club_id());

CREATE POLICY "club_todos_insert" ON club_todos
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_todos_update" ON club_todos
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_todos_delete" ON club_todos
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER club_todos_updated_at
  BEFORE UPDATE ON club_todos
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
