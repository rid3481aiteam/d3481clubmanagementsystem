# D3481 扶輪社管理系統 — 工作交接紀錄

> 最後更新：2026-07-01

---

## 本次完成

### 架構規劃（全部定案）
- 角色體系、帳號邀請流程、權限矩陣詳見 `ARCHITECTURE.md`

### Supabase 資料庫（全部完成）
| Migration | 內容 |
|-----------|------|
| 001_clubs_auth | clubs、user_profiles、RLS、helper functions |
| 002_roster_members | roster、prospective_members、member_care、RLS |
| 003_meetings_attendance | meetings、attendance_sessions、attendance_details、member_attendance_rate VIEW |
| 004_feature_flags | feature_flags（含 15 項預設值）、feature_enabled() |
| 005_add_year_term | meetings.year_term 自動計算欄位（扶輪年度 7/1~6/30） |
| 006_fix_rls_policies | is_club_secretary()、執秘可管理社長帳號的 RLS |
| 007_invite_log | invite_log 稽核表 |

### Edge Function
- `invite-user`：驗證角色後邀請帳號，寫入 invite_log
  - district_admin → 邀請 club_secretary
  - club_secretary → 邀請本社 club_admin（社長）

### Auth Hook
- `handle_new_user`：受邀者確認後自動建立 user_profiles（從 raw_app_meta_data 取 club_id / role）

---

## 角色體系（定案）

| 角色 | 說明 | 生命週期 |
|------|------|---------|
| district_admin | 地區管理員 | 長期 |
| club_secretary | 執秘，每社 1 個，日常操作主力 | 長期 |
| club_admin | 社長，每社 1 個，每年新帳號 | 一年一屆 |
| club_member | 保留 enum，暫不開放 | — |

**邀請鏈**：district_admin → 執秘 → 社長（社長卸任由執秘停用舊帳號）

---

## Supabase 專案資訊

- **Project URL**：`https://xdwqrgthsxyzclnjlmvy.supabase.co`
- **Edge Function**：`invite-user`（已部署）
- **Auth Hook**：`handle_new_user`（已建於 SQL Editor）

---

## 下一步：前端開發（尚未開始）

### 優先順序
1. **登入頁面** + Vue Router 路由守衛（依 role 導向不同首頁）
2. **地區管理員介面**
   - 社團列表 + 新增社團
   - 邀請執秘（呼叫 invite-user Edge Function）
   - Feature Flag 管理
3. **執秘介面**
   - 名冊管理（列表、CRUD、Excel 匯入匯出）
   - 例會管理（含 year_term 顯示）
   - 出席記錄輸入
   - 邀請社長
4. **社長介面**
   - 社務報表（出席統計、名冊查閱）
5. **地區通訊錄**（全角色可用）

### 技術注意事項
- 前端呼叫 `invite-user` 需帶 `Authorization: Bearer <access_token>`
- `year_term` 是 DB 自動計算欄位，前端不需傳入
- Feature flag 用 `features.ts` store 的 `isEnabled(key)` 判斷是否渲染功能
- 所有 DB 查詢直接用 Supabase client，不走 ORM

---

## 未解決問題

- 無

## Phase 2（暫緩）

- B5 EDM 通知（AI 整合）
- D4 社友關懷
- 社費 / 財務模組
