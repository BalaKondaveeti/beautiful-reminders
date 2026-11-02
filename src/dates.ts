// Date-only helpers. Everything works on local calendar dates as 'YYYY-MM-DD'
// strings; day differences are computed on the calendar components so DST
// and UTC offsets never shift a day.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m, d]
}

function dayNumber(iso: string): number {
  const [y, m, d] = parts(iso)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

/** b − a in whole days */
export function diffDays(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a)
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso)
  return toISO(new Date(y, m - 1, d + n))
}

export function localDate(iso: string): Date {
  const [y, m, d] = parts(iso)
  return new Date(y, m - 1, d)
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return localDate(iso).toLocaleDateString(undefined, opts)
}

export function fmtTimestamp(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function weekdayLetters(): string[] {
  // Monday-first
  const base = new Date(2024, 0, 1) // a Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(base.getFullYear(), 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }),
  )
}
