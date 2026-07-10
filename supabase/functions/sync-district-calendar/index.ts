import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_DRIVE_API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY')!
const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

const SPREADSHEET_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type ParsedEvent = {
  start_date: string
  end_date: string
  time_slot: string | null
  title: string
  location: string | null
  sort_order: number
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function logResult(status: 'success' | 'error', extra: Record<string, unknown>) {
  const { error } = await supabase.from('district_calendar_sync_log').insert({ status, ...extra })
  if (error) console.error('寫入 district_calendar_sync_log 失敗', error)
}

// 來源日期格式固定是「YYYY.MM.DD(星期)」文字（不是 Excel 日期型別），只取數字部分。
function parseDate(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw)
  const m = s.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// 依標題文字比對欄位位置（起/迄/時間/活動名稱/地點），不假設固定欄位順序，
// 地區辦公室之後調整過欄位順序時，只要標題字樣沒變就還能正確解析。
// 來源檔案的「地點」標頭實際存的是「地   點」（中間夾雜全形空白），所以比對前要先把
// 空白字元全部去掉再比對，不能用 trim() 後直接相等（trim 只會去掉頭尾，去不掉中間的）。
function normalizeHeader(cell: unknown) {
  return String(cell ?? '').replace(/\s+/g, '')
}

function findColumns(rows: unknown[][]) {
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const row = (rows[r] ?? []).map((c) => normalizeHeader(c))
    const colTitle = row.indexOf('活動名稱')
    if (colTitle === -1) continue
    return {
      headerRow: r,
      colStart: row.indexOf('起'),
      colEnd: row.indexOf('迄'),
      colTime: row.indexOf('時間'),
      colTitle,
      colLocation: row.indexOf('地點'),
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return jsonResponse({ error: '未授權' }, 401)
  }

  try {
    // 1. 找出資料夾裡最新（依修改時間排序）的 Excel 檔案
    const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='${SPREADSHEET_MIME}' and trashed=false`
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,modifiedTime)&key=${GOOGLE_DRIVE_API_KEY}`

    const listRes = await fetch(listUrl)
    if (!listRes.ok) {
      const text = await listRes.text()
      const message = `Drive 檔案列表查詢失敗 HTTP ${listRes.status}：${text.slice(0, 500)}`
      await logResult('error', { error_message: message })
      return jsonResponse({ error: message }, 502)
    }
    const listData = await listRes.json()
    const file = listData.files?.[0]
    if (!file) {
      const message = '資料夾內找不到 Excel 檔案'
      await logResult('error', { error_message: message })
      return jsonResponse({ error: message }, 404)
    }

    // 2. 下載檔案
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`
    const fileRes = await fetch(downloadUrl)
    if (!fileRes.ok) {
      const text = await fileRes.text()
      const message = `Drive 檔案下載失敗 HTTP ${fileRes.status}：${text.slice(0, 500)}`
      await logResult('error', { source_file_name: file.name, error_message: message })
      return jsonResponse({ error: message }, 502)
    }
    const buf = new Uint8Array(await fileRes.arrayBuffer())

    // 3. 解析 xlsx
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheetName = workbook.SheetNames.find((n: string) => n.includes('行事曆')) ?? workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    const cols = findColumns(rows)
    if (!cols) {
      const message = '找不到欄位標題列（起/迄/時間/活動名稱/地點），檔案格式可能已變更，保留現有資料不覆蓋'
      await logResult('error', { source_file_name: file.name, error_message: message })
      return jsonResponse({ error: message }, 422)
    }

    const events: ParsedEvent[] = []
    for (let r = cols.headerRow + 1; r < rows.length; r++) {
      const row = rows[r] ?? []
      const rawTitle = row[cols.colTitle]
      if (rawTitle == null || String(rawTitle).trim() === '') continue
      const startDate = parseDate(row[cols.colStart])
      if (!startDate) continue
      const endDate = parseDate(row[cols.colEnd]) ?? startDate
      events.push({
        start_date: startDate,
        end_date: endDate,
        time_slot: cols.colTime >= 0 && row[cols.colTime] != null ? String(row[cols.colTime]).trim() : null,
        title: String(rawTitle).trim(),
        location: cols.colLocation >= 0 && row[cols.colLocation] != null ? String(row[cols.colLocation]).trim() : null,
        sort_order: events.length,
      })
    }

    if (events.length === 0) {
      const message = '解析結果為 0 筆活動，可能是檔案格式跑掉，保留現有資料不覆蓋'
      await logResult('error', { source_file_name: file.name, error_message: message })
      return jsonResponse({ error: message }, 422)
    }

    // 4. 整批覆蓋：來源檔案沒有穩定的唯一 ID 可比對，每次同步直接清空重寫。
    // 只有解析成功且非空才會走到這裡，抓取/解析失敗都會在上面提早 return，不會清空舊資料。
    const { error: deleteError } = await supabase.from('district_calendar_events').delete().not('id', 'is', null)
    if (deleteError) {
      const message = `清空舊資料失敗：${deleteError.message}`
      await logResult('error', { source_file_name: file.name, error_message: message })
      return jsonResponse({ error: message }, 500)
    }

    const { error: insertError } = await supabase.from('district_calendar_events').insert(events)
    if (insertError) {
      const message = `寫入新資料失敗：${insertError.message}`
      await logResult('error', { source_file_name: file.name, error_message: message })
      return jsonResponse({ error: message }, 500)
    }

    await logResult('success', {
      source_file_name: file.name,
      source_modified_at: file.modifiedTime,
      event_count: events.length,
    })

    return jsonResponse({ ok: true, event_count: events.length, source_file_name: file.name })
  } catch (err) {
    const message = `未預期錯誤：${err instanceof Error ? err.message : String(err)}`
    await logResult('error', { error_message: message })
    return jsonResponse({ error: message }, 500)
  }
})
