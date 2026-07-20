-- ════════════════════════════════════════════
-- 056_hide_iou_edm_line_notify.sql
-- 使用者要求先隱藏三項功能：IOU 捐獻收據追蹤、EDM 產生器、
-- LINE 通知設定。用既有的功能開關機制關閉（不是刪除功能/程式碼，
-- 之後要恢復到「功能開關管理」頁面打開即可）。
--
-- G1_iou／B5_edm 004 migration 就已經建過地區層的 row（陸續被在
-- 「功能開關管理」頁打開過），這裡用 UPDATE 關掉；J1_line_notify
-- 是這輪新增的 flag（LINE 通知選單原本沒有開關、一直是明碼顯示），
-- 還沒有地區層 row，用 INSERT ... WHERE NOT EXISTS 補一筆關閉的
-- 預設值（不用 ON CONFLICT，club_id 是 NULL 時 unique constraint
-- 不會正確比對 NULL，改用明確的 WHERE NOT EXISTS 判斷是否已存在）。
-- ════════════════════════════════════════════

UPDATE feature_flags SET enabled = false, updated_at = now()
WHERE club_id IS NULL AND feature_key IN ('G1_iou', 'B5_edm');

INSERT INTO feature_flags (club_id, feature_key, enabled)
SELECT NULL, 'J1_line_notify', false
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE club_id IS NULL AND feature_key = 'J1_line_notify'
);
