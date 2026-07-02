# D3481 扶輪社管理系統 — 架構規格

> 定案日期：2026-07-01

---

## 技術棧

| 層 | 技術 |
|----|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia |
| 後端 | Supabase (PostgreSQL + Auth + Edge Functions) |
| Excel | SheetJS |
| 部署 | Cloudflare Pages |

---

## 角色體系

| 角色 | enum | 數量 | 生命週期 |
|------|------|------|---------|
| 地區管理員 | `district_admin` | 地區層級 | 長期 |
| 執行秘書 | `club_secretary` | 每社 1 個 | 長期（執秘換人才換帳號） |
| 社長 | `club_admin` | 每社 1 個（當屆） | 一年一屆，每年新帳號 |
| 一般社員 | `club_member` | — | 暫不開放，保留 enum 備用 |

---

## 帳號邀請流程

> 2026-07-02 修訂：權限模型簡化為三層——**地區**（全區檢視、不編輯各社資料）／
> **各社**（社長與執秘對等，全權編輯本社資料並自行管理本社帳號）／**一般人**（唯讀，Phase 2 再做，見下方 Phase 規劃）。
> 不再區分「執秘限管社長」這種單向關係，社長與執秘互為對等的「各社層」帳號。

```
district_admin
  └─► 為任何社邀請第一組帳號（社長或執秘皆可，新社團 bootstrap 用）

club_admin / club_secretary（各社層，對等）
  └─► 互相邀請 / 停用本社的社長或執秘帳號（角色不限，由各社自行決定）
```

**邀請機制**：Supabase `auth.admin.inviteUserByEmail()` via Edge Function

**安全規則**（Edge Function 內驗證）：

| 動作 | 允許角色 |
|------|---------|
| 邀請本社帳號（社長或執秘） | district_admin（任何社，bootstrap 用）、club_admin / club_secretary（限本社 club_id） |
| 停用 / 啟用本社帳號 | district_admin（任何社）、club_admin / club_secretary（限本社，互相對等） |

---

## 資料隔離原則

- 每張表都有 `club_id` 欄位
- Supabase RLS 自動隔離：`club_id = current_club_id()`
- `district_admin` 可讀全區所有社資料
- 任何社的帳號無法讀寫其他社的資料

---

## 功能 Feature Flags

Feature flag 分兩層：
1. **地區預設**：`club_id = NULL`
2. **社別覆蓋**：`club_id = <uuid>`，覆蓋地區預設

| Key | 預設 | 說明 |
|-----|------|------|
| `A1_login` | ✅ | 登入（永遠開） |
| `A2_roles` | ✅ | 角色管理 |
| `A3_isolation` | ✅ | 資料隔離 |
| `B1_meeting_info` | ✅ | 例會資訊 |
| `B2_attendance_summary` | ✅ | 出席彙總 |
| `B3_attendance_personal` | ✅ | 個人出席率 |
| `B4_attendance_detail` | ✅ | 逐人簽到 |
| `B5_edm` | ❌ | EDM 通知（Phase 2） |
| `D1_roster` | ✅ | 社友名冊 |
| `D2_roster_excel` | ✅ | Excel 匯入匯出 |
| `D3_prospective` | ✅ | 潛在社友 |
| `D4_care` | ❌ | 社友關懷（選配） |
| `H1_directory` | ✅ | 地區通訊錄 |
| `H2_directory_search` | ✅ | 通訊錄搜尋 |
| `H3_directory_admin` | ✅ | 通訊錄維護 |

---

## 角色權限矩陣

| 功能 | district_admin | club_admin | club_secretary |
|------|:-:|:-:|:-:|
| **帳號管理** | | | |
| 邀請本社帳號（社長或執秘） | ✅ 任何社（bootstrap） | ✅（本社） | ✅（本社） |
| 停用 / 啟用本社帳號 | ✅ 任何社 | ✅（本社，互相對等） | ✅（本社，互相對等） |
| **例會 / 出席** | | | |
| 查看例會 | ✅ 全區 | ✅ 本社 | ✅ 本社 |
| 新增 / 編輯例會 | ✅ | ✅ | ✅ |
| 輸入出席記錄 | ✅ | ✅ | ✅ |
| 出席統計（含個人出席率） | ✅ 全區 | ✅ 本社 | ✅ 本社 |
| **名冊** | | | |
| 查看名冊 | ✅ 全區 | ✅ 本社 | ✅ 本社 |
| 新增 / 編輯名冊 | ✅ | ✅ | ✅ |
| Excel 匯入匯出 | ✅ | ✅ | ✅ |
| 潛在社友追蹤 | ✅ | ✅ | ✅ |
| **地區通訊錄** | | | |
| 瀏覽全區社團 | ✅ | ✅ | ✅ |
| 搜尋 | ✅ | ✅ | ✅ |
| 編輯通訊錄 | ✅ 全區 | ✅ 本社 | ✅ 本社 |
| **系統管理** | | | |
| Feature Flag 管理 | ✅ | ❌ | ❌ |
| 跨社統計報表 | ✅ | ❌ | ❌ |

---

## 統計週期

- 扶輪年度：**7/1 ~ 6/30**
- `meetings.year_term` 格式：`'2025-2026'`
- 所有出席率統計以 `year_term` 為單位

---

## 資料庫表格清單

### 現有（migrations 001~004）

| 表格 | 說明 |
|------|------|
| `clubs` | 各社基本資料 |
| `user_profiles` | 使用者 profile（擴充 auth.users） |
| `feature_flags` | 功能開關（地區 / 社別兩層） |
| `meetings` | 例會紀錄 |
| `attendance_sessions` | 出席彙總 |
| `attendance_details` | 逐人出席明細 |
| `member_attendance_rate` | 個人出席率（VIEW） |
| `roster` | 社友名冊 |
| `prospective_members` | 潛在社友 |
| `member_care` | 社友關懷 |

### 待補（migrations 005~007）

| Migration | 說明 |
|-----------|------|
| `005_add_year_term.sql` | `meetings` 加 `year_term` 欄位 |
| `006_fix_rls_policies.sql` | 補 club_secretary 邀請社長的 RLS |
| `007_invite_log.sql` | 邀請稽核記錄表 |

### 待建 Edge Function

| Function | 說明 |
|----------|------|
| `invite-user` | 邀請帳號（驗證角色後呼叫 Supabase admin API） |

---

## Phase 規劃

- **Phase 1**：本文件所有功能
- **Phase 2**：B5 EDM、D4 社友關懷、社費 / 財務模組、**一般人公開瀏覽層**（各社自訂哪些資料對外公開，需新增公開欄位 + 匿名可讀 RLS + 對外頁面，範圍較大，尚未設計）
