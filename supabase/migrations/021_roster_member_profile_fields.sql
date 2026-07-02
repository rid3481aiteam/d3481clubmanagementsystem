-- ════════════════════════════════════════════
-- 021_roster_member_profile_fields.sql
-- 社友名冊補齊社內職稱、社友狀態、個人/公司電話欄位
-- ════════════════════════════════════════════

ALTER TABLE roster
  ADD COLUMN IF NOT EXISTS club_position text NOT NULL DEFAULT '社友'
    CHECK (club_position IN ('PP', 'IPP', 'P', 'VP', 'PE', 'S', '社友')),
  ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'normal'
    CHECK (member_status IN ('normal', 'leave', 'resigned')),
  ADD COLUMN IF NOT EXISTS personal_phone text,
  ADD COLUMN IF NOT EXISTS company_phone text;

UPDATE roster
SET
  personal_phone = COALESCE(personal_phone, phone),
  member_status = CASE
    WHEN is_active THEN member_status
    ELSE 'resigned'
  END
WHERE personal_phone IS NULL
   OR member_status <> CASE WHEN is_active THEN member_status ELSE 'resigned' END;
