# D3481 SOP 專案進度記錄

> 記錄時間：2026-07-07（中途被使用者中斷，要換帳號繼續編輯）

## 兩份文件的整體目標
1. **文件一（建置歷程 SOP）**：從 0 到現在怎麼跟 AI 建置整個平台，含 prompt/工具/評估理由，PDF 格式
2. **文件二（功能操作 SOP）**：各功能圖文操作步驟拆解，用實體截圖，PDF 格式
   - 範圍已跟使用者確認：地區管理員（邀請/管理地區帳號、社團總覽、地區通訊錄）+ 社長/執秘（邀請/管理本社帳號、社友名冊、例會與出席登記、地區通訊錄）

## 文件一：已完成，等待使用者審閱
- Markdown 原始檔：`docs/sop/01-建置歷程.md`（repo 內，`/tmp/d3481clubmanagementsystem/docs/sop/`）
- PDF 成品：`docs/sop/D3481建置歷程SOP.pdf`（17 頁，深藍/古銅金雜誌式排版，CJK 正常）
- 建置腳本：`/private/tmp/.../scratchpad/d3481-sop/build_pdf.py`（Markdown→HTML→用 headless Chrome print-to-pdf，因為機器上沒有 weasyprint/pandoc）
- **狀態：尚未 commit + push**——內容是敘事詮釋，等使用者確認語氣/史實正確再上。
- 素材來源：`STORY.md`、`CODEX_PROMPT.md`、`ARCHITECTURE.md`、`HANDOFF.md`（41輪）、git log

## 文件二：進行中，被中斷

### 已建立的示範資料（正式站 Supabase，非本機）
- 示範社團：`clubs` 表新增一筆「示範扶輪社（SOP教材用）」，zone=`教材示範`，id=`ec8e7b54-431f-49c1-a770-5a7e8e7ebf53`
- 示範帳號：`sop@gmail.com`（密碼由使用者保管，不寫入 repo；接手時直接跟使用者要），`user_profiles.role=club_secretary`，綁定上述示範社團
- **已經在示範社團的「社友名冊」新增了一筆真實測試資料**：中文姓名「王小明」，其餘欄位空白——這是截圖過程中實際存進資料庫的，不是假的，之後如果要清乾淨示範資料可以直接在該筆刪除
- 地區管理員視角（邀請/管理地區帳號、社團總覽）**還沒有示範帳號**，使用者尚未決定要給真實 `yhwang0928@gmail.com` 密碼還是比照建一個新示範地區帳號（Task #5 待處理）

### 環境設定
- `/tmp/d3481clubmanagementsystem/.env.local` 已建立（真實 Supabase URL + anon key，使用者提供）
- dev server 已啟動：`d3481-dev`（port 5174），preview serverId=`997d7442-946b-4d7f-983c-06e54aea27f1`（可能已隨對話結束而關閉，下次要重啟）

### 已完成的截圖（尚未整理進文件，存在對話紀錄裡，未落地存檔）
1. 登入頁（空白狀態）
2. 登入頁（已填 email/密碼）
3. 登入後導向社友名冊頁（空清單）
4. 點「+ 新增社友」彈出表單（空白）
5. 表單填入「王小明」
6. 儲存後名冊列表出現「王小明」這筆

**注意：以上截圖目前只在對話的 tool result 裡，沒有另存成檔案。** 下次接手時建議：
- 用 `mcp__Claude_Preview__preview_screenshot` 重新截或找方法把已產生的截圖存到 `scratchpad/d3481-sop/screenshots/` 目錄，用有序檔名（01-login-empty.png 等）方便組裝文件
- 之前操作 UI 時發現：這個平台的 Modal 儲存按鈕沒有 `type="submit"` 屬性，`preview_click` 用一般 CSS 選不到，最後是用 `preview_eval` 找 `textContent.trim()==='儲存'` 的 button 直接 `.click()` 才成功——類似 modal 的其他儲存按鈕大概率也要用這招

### 待完成流程（Task #1~#4 剩餘部分）
- [ ] 社友名冊：編輯既有社友、Excel 匯入/匯出（Task #1 剩餘）
- [ ] 帳號管理：邀請本社帳號、帳號列表、停用/啟用（Task #2）
- [ ] 例會管理：新增例會、出席彙總登記、逐人出席勾選（Task #3）
- [ ] 地區通訊錄：瀏覽、分區篩選、搜尋（Task #4，唯讀，用 sop@gmail.com 即可測）
- [ ] 地區管理員視角：邀請/管理地區帳號、社團總覽（Task #5，需要先取得地區示範帳號）
- [ ] 把所有截圖 + 步驟文字整理成 Markdown，套用跟文件一同款視覺（`build_pdf.py` 那套 navy/gold 樣式），輸出 PDF 到 `docs/sop/`（Task #6）

## 使用者要求
使用者中斷要求「先停止並做記錄，我要用另外一個帳號持續編輯SOP」——推測是要換一個帳號/身分接手編輯文件一的 Markdown 內容（或是接手整個 SOP 專案），細節需要下次確認使用者實際想做什麼、需不需要 Claude 繼續動文件二的截圖工作。
