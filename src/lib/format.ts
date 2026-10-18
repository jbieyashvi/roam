const thb = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

/** Thai baht, e.g. ฿1,250. All amounts in Roam are sample estimates. */
export const formatTHB = (n: number) => `฿${thb.format(Math.round(n))}`

export const formatSignedTHB = (n: number) => (n === 0 ? '±฿0' : `${n > 0 ? '+' : '−'}${formatTHB(Math.abs(n))}`)
export function formatClock(mins: number) {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatDuration(mins: number) {
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}

export const formatSignedDuration = (mins: number) => (mins === 0 ? 'no change' : `${mins > 0 ? '+' : '−'}${formatDuration(mins)}`)

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return ''
  return parseISO(iso).toLocaleDateString('en-GB', opts)
}

export function formatDateRange(startIso: string, days: number) {
  if (!startIso) return 'Dates not set'
  const end = addDays(startIso, days - 1)
  return `${formatDate(startIso, { day: 'numeric', month: 'short' })} – ${formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
