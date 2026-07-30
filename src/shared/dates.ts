import type { WeekStart } from './types'

/** All date math here works on 'YYYY-MM-DD' strings in local calendar terms. */

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  return toIsoDate(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function addMonths(iso: string, months: number): string {
  const d = parseIsoDate(iso)
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  return toIsoDate(d)
}

/** Start of the week containing `iso`, honouring the week_start setting. */
export function startOfWeek(iso: string, weekStart: WeekStart): string {
  const d = parseIsoDate(iso)
  const dow = d.getDay() // 0 = Sunday
  const offset = weekStart === 'monday' ? (dow + 6) % 7 : dow
  return addDays(iso, -offset)
}

export function endOfWeek(iso: string, weekStart: WeekStart): string {
  return addDays(startOfWeek(iso, weekStart), 6)
}

export function startOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function endOfMonth(year: number, month: number): string {
  // Day 0 of the next month is the last day of this one.
  return toIsoDate(new Date(year, month, 0))
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3))

/** e.g. "Mar 3 – Mar 9, 2025" */
export function rangeLabel(from: string, to: string): string {
  const a = parseIsoDate(from)
  const b = parseIsoDate(to)
  const left = `${SHORT_MONTHS[a.getMonth()]} ${a.getDate()}`
  const right = `${SHORT_MONTHS[b.getMonth()]} ${b.getDate()}`
  return `${left} – ${right}, ${b.getFullYear()}`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function dayLabel(iso: string): string {
  const d = parseIsoDate(iso)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}`
}

/** Every 'YYYY-MM-DD' from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) out.push(cur)
  return out
}
