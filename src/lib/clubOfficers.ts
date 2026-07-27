import type { Club, ClubOfficer } from '@/types'

interface ClubOfficersEntry {
  president?: ClubOfficer
  secretary?: ClubOfficer
}

export function buildOfficersByClub(termOfficers: ClubOfficer[]): Map<string, ClubOfficersEntry> {
  const map = new Map<string, ClubOfficersEntry>()
  for (const o of termOfficers) {
    if (o.role !== 'president' && o.role !== 'secretary') continue
    const entry = map.get(o.club_id) ?? {}
    if (o.role === 'president') entry.president = o
    else entry.secretary = o
    map.set(o.club_id, entry)
  }
  return map
}

export interface ResolvedLeaders {
  presName: string | null
  secName: string | null
}

// clubs.pres_name/sec_name 是舊的靜態欄位（「編輯社團」表單可以改），
// club_officers 是各社透過「本社歷程」自己維護的當年度紀錄——兩邊都
// 可能是使用者最後更新資料的地方（例如換屆後 club_officers 更新了，
// 但也可能是社長中途異動、直接在「編輯社團」改了 clubs.pres_name），
// 不能總是無條件偏好其中一邊，改成比較 updated_at，時間比較新的那筆
// 才是準的。
export function resolveClubLeaders(c: Club, officersByClub: Map<string, ClubOfficersEntry>): ResolvedLeaders {
  const entry = officersByClub.get(c.id)
  return {
    presName: pickNewer(c.pres_name, c.updated_at, entry?.president?.name ?? null, entry?.president?.updated_at ?? null),
    secName: pickNewer(c.sec_name, c.updated_at, entry?.secretary?.name ?? null, entry?.secretary?.updated_at ?? null),
  }
}

function pickNewer(
  staticValue: string | null,
  staticUpdatedAt: string,
  dynamicValue: string | null,
  dynamicUpdatedAt: string | null
): string | null {
  if (!dynamicValue) return staticValue
  if (!staticValue) return dynamicValue
  return new Date(dynamicUpdatedAt as string) >= new Date(staticUpdatedAt) ? dynamicValue : staticValue
}
