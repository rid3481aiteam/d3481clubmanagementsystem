# 扶輪3481地區社務平台 — Codex 建置規格

## 專案概述

為國際扶輪3481地區建置一套社務管理平台。支援100+個扶輪社，每社有多位使用者，地區管理員可跨社查看資料。

## Tech Stack

- **框架**：Vue 3 + Vite + TypeScript（Composition API + `<script setup>`）
- **路由**：Vue Router 4
- **狀態管理**：Pinia
- **後端**：Supabase（Auth + PostgreSQL + RLS）
- **Excel**：SheetJS（xlsx）
- **部署**：Cloudflare Pages
- **CSS**：不使用 Tailwind，使用現有 CSS variables（見下方 Design System）

## 專案結構

```
rotary3481/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── lib/supabase.ts          ← 已提供
│   ├── types/index.ts           ← 已提供（所有 TS 型別）
│   ├── stores/
│   │   ├── auth.ts              ← 已提供
│   │   ├── features.ts          ← 已提供
│   │   └── club.ts              ← 需建立
│   ├── router/index.ts          ← 已提供
│   ├── views/
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   ├── meetings/
│   │   │   ├── MeetingListView.vue
│   │   │   └── AttendanceView.vue
│   │   ├── roster/
│   │   │   ├── RosterView.vue
│   │   │   └── ProspectiveView.vue
│   │   └── directory/
│   │       └── DirectoryView.vue
│   └── components/
│       ├── layout/
│       │   ├── TopNav.vue
│       │   └── Sidebar.vue
│       └── ui/
│           ├── AppModal.vue
│           ├── AppTable.vue
│           ├── AppBadge.vue
│           └── AppToast.vue
├── supabase/
│   └── migrations/              ← 已提供（001~004.sql）
├── .env.local                   ← 需填入 Supabase URL & KEY
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 已提供的檔案

- `src/types/index.ts` — 所有 TypeScript 型別定義
- `src/lib/supabase.ts` — Supabase client
- `src/stores/auth.ts` — 登入 / 登出 / profile
- `src/stores/features.ts` — 功能開關（feature flags）
- `src/router/index.ts` — 路由 + 守衛
- `supabase/migrations/001~004.sql` — DB schema + RLS

## Phase 1 功能範圍

### A 帳號（基礎，不需要獨立頁面）
- Email 登入 / 登出
- 角色：district_admin / club_admin / club_secretary / club_member
- 登入後自動載入 user_profiles，取得 club_id 和 role

### B 例會管理
- **B1** MeetingListView：列表 + 新增 / 編輯 / 刪除例會
- **B2** AttendanceView（彙總）：填入 total/present/absent/leave/exempt，rate 自動計算
- **B3** 個人出席率：從 member_attendance_rate view 讀取，顯示表格 + 低於閾值警示
- **B4** 出席明細：逐人勾選 present/absent/leave/exempt（需先有 roster 資料）
- **B5** EDM 草稿：依例會資訊產生文字模板，可複製（不串接 AI API，用 template 即可）

### D 社友名冊
- **D1** RosterView：社友清單，搜尋 / 篩選（在職/離職），新增 / 編輯
- **D2** Excel 匯入：SheetJS 解析 RosterExcelRow 格式，批次 upsert；匯出全部社友為 xlsx
- **D3** ProspectiveView：潛在社友追蹤，狀態篩選，新增 / 編輯 / 追蹤提醒
- **D4** 社友關懷：依社友記錄關懷事件，首頁 Dashboard 顯示本週生日

### H 通訊錄
- **H1** DirectoryView：顯示全地區各社資料（從 clubs 表讀取）
- **H2** 分區篩選 + 關鍵字搜尋
- **H3** 地區管理員可編輯各社資料（role = district_admin 才顯示編輯按鈕）

### 儀表板（首頁）
- 本社例會數、平均出席率、社友人數、本週生日
- 低出席率警示清單
- 待追蹤潛在社友清單

## Design System（CSS Variables）

```css
:root {
  --navy: #1C2B4A;
  --navy2: #2C3F6B;
  --gold: #B8892A;
  --gold-l: #D4A84B;
  --gold-p: #FDF8EE;
  --green: #2A6B48;
  --red: #B03030;
  --teal: #1A6B5E;
  --bg: #F3F0EB;
  --card: #fff;
  --text: #1A1A2A;
  --muted: #6B7280;
  --border: rgba(28,43,74,.1);
  --r: 10px;
}
```

### 共用 class 慣例（沿用原設計）
```css
.btn          /* 按鈕基底 */
.btn-p        /* 主色（navy）*/
.btn-gold     /* 金色 */
.btn-g        /* 灰色 ghost */
.btn-red      /* 紅色 */
.bdg          /* badge 基底 */
.b-g .b-r .b-y .b-b .b-n   /* badge 顏色 */
.tw           /* table wrapper card */
.th           /* table header row */
.fi           /* form input */
.fl           /* form label */
.mo .mb       /* modal overlay + box */
.page         /* page container */
.ph           /* page header */
```

## 重要開發規則

1. 所有 DB 查詢必須使用 `supabase` client，不寫 raw SQL
2. 每個 view 開頭先用 `useFeaturesStore().isEnabled('Xx_key')` 確認功能開關
3. 寫入操作前先用 `useAuthStore().canWrite` 確認權限
4. `district_admin` 查詢不帶 club_id filter；其他角色一律帶 `eq('club_id', clubId)`
5. 型別全部從 `@/types` 匯入，不重複定義
6. 元件命名：views 用 `XxxView.vue`，共用元件用 `AppXxx.vue`
7. 每個 store action 回傳 `{ error }` 而非 throw，讓 UI 決定如何處理錯誤

## 環境變數（.env.local）

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 初始化指令

```bash
npm create vite@latest rotary3481 -- --template vue-ts
cd rotary3481
npm install @supabase/supabase-js pinia vue-router xlsx
```
