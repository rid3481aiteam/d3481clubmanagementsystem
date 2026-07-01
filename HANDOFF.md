# D3481 扶輪社管理系統 — 工作交接紀錄

> 最後更新：2026-07-01

---

## 本次完成

### P1 前端骨架（全部完成）

| 檔案 | 說明 |
|------|------|
| `package.json` / `vite.config.ts` / `tsconfig.json` | Vite + Vue 3 + TS 專案設定 |
| `index.html` | HTML 入口 |
| `src/main.ts` | App 初始化（Pinia + Router） |
| `src/App.vue` | 全域 CSS variables（扶輪藍 #17458F + 金 #F7A81B）、Layout（TopNav + Sidebar + RouterView）、Splash loading |
| `src/components/layout/TopNav.vue` | 頂部導覽列：logo、標題、使用者名稱、角色 badge、登出 |
| `src/components/layout/Sidebar.vue` | 左側選單，依 role 動態顯示（district_admin / club_secretary / club_admin） |
| `src/views/LoginView.vue` | 登入頁：Email/密碼、錯誤提示、依 role 導向 |
| `src/views/DashboardView.vue` | 儀表板佔位 |
| `src/views/admin/*.vue` | 地區管理員頁面佔位（P4） |
| `src/views/roster/*.vue` | 名冊頁面佔位（P2/P3） |
| `src/views/meetings/*.vue` | 例會頁面佔位（P3） |
| `src/views/directory/*.vue` | 通訊錄佔位（P4） |
| `src/stores/club.ts` | 社別 store（fetchCurrent / fetchAll / upsertClub） |
| `src/router/index.ts` | 新增 admin 路由、role guard、feature flag guard |

### 啟動方式
```bash
cd /tmp/d3481clubmanagementsystem   # 每次對話需重新 clone
npm install
# 填入 .env.local 的 VITE_SUPABASE_ANON_KEY
npm run dev   # port 5174
```

---

## Supabase 資料庫（全部完成）

| Migration | 內容 |
|-----------|------|
| 001_clubs_auth | clubs、user_profiles、RLS、helper functions |
| 002_roster_members | roster、prospective_members、member_care、RLS |
| 003_meetings_attendance | meetings、attendance_sessions、attendance_details、member_attendance_rate VIEW |
| 004_feature_flags | feature_flags（含 15 項預設值）、feature_enabled() |
| 005_add_year_term | meetings.year_term 自動計算欄位（扶輪年度 7/1~6/30） |
| 006_fix_rls_policies | is_club_secretary()、執秘可管理社長帳號的 RLS |
| 007_invite_log | invite_log 稽核表 |

---

## 角色體系（定案）

| 角色 | 說明 | 生命週期 |
|------|------|---------|
| district_admin | 地區管理員 | 長期 |
| club_secretary | 執秘，每社 1 個，日常操作主力 | 長期 |
| club_admin | 社長，每社 1 個，每年新帳號 | 一年一屆 |
| club_member | 保留 enum，暫不開放 | — |

---

## 下一步：P2 社友名冊（RosterView.vue）

### 功能清單
- [ ] 社友列表（表格：姓名、暱稱、職稱、公司、電話、Email、入社日期、狀態）
- [ ] 搜尋（關鍵字）+ 篩選（在職 / 離職）
- [ ] 新增 / 編輯社友 Modal
- [ ] 停用社友（is_active = false）
- [ ] Excel 匯入（SheetJS，feature flag `D2_roster_excel`）
- [ ] Excel 匯出

### 技術注意
- `club_secretary` 可 CRUD；`club_admin` 唯讀（`auth.canWrite` 判斷）
- `district_admin` 查詢不帶 club_id filter
- Excel 匯入格式見 `types/index.ts` 的 `RosterExcelRow`

---

## Supabase 專案資訊

- **Project URL**：`https://xdwqrgthsxyzclnjlmvy.supabase.co`
- **Edge Function**：`invite-user`（已部署）
- **Auth Hook**：`handle_new_user`（已建於 SQL Editor）

---

## 未解決問題

- `.env.local` 的 `VITE_SUPABASE_ANON_KEY` 目前是 placeholder，需填入真實值才能連接 Supabase（去 Supabase dashboard → Settings → API 複製 anon public key）

## Phase 2（暫緩）

- B5 EDM 通知（AI 整合）
- D4 社友關懷
- 社費 / 財務模組
