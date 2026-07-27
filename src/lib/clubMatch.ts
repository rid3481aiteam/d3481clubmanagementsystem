import type { Club } from '@/types'

// SSO 帶回來的自稱社別通常是簡稱（例如「忠孝社」），跟社團目錄的正式全名
// （「台北忠孝扶輪社」）對不上，去掉「扶輪社／扶輪／社」這類共同字樣後
// 再比對，只有唯一命中才自動帶入，避免同名分社猜錯（例如兩個社都叫「XX社」）。
export function normalizeClubName(name: string) {
  return name.replace(/扶輪社|扶輪|社$/g, '').trim()
}

export function suggestClubId(ssoRotaryClub: string | null, clubs: Club[]): string | null {
  if (!ssoRotaryClub) return null
  const target = normalizeClubName(ssoRotaryClub)
  if (!target) return null
  const matches = clubs.filter(c => {
    const n = normalizeClubName(c.name)
    return n === target || n.includes(target) || target.includes(n)
  })
  return matches.length === 1 ? matches[0].id : null
}
