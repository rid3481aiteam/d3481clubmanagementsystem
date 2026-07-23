-- ════════════════════════════════════════════
-- 059_club_officers_primary_role.sql
-- 「社的年度成員」主要幹部新增自訂職位（例如財務／糾察／前屆社長／理事會等
-- 組織表既有但系統原本只有社長/社長當選人/副社長/秘書四個固定欄位的職稱）
-- 沿用 committee_member 的 committee_name（職位名稱）+ note（細項，例如「助理」）
-- 寫法，但用新角色 primary_officer 跟真正的委員會分開分組顯示
-- ════════════════════════════════════════════

ALTER TYPE club_officer_role ADD VALUE IF NOT EXISTS 'primary_officer';
