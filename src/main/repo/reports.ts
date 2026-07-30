import type { Db } from '../db'
import type { Report, ReportBucket } from '@shared/types'
import {
  addDays,
  dayLabel,
  eachDay,
  endOfMonth,
  endOfWeek,
  monthLabel,
  rangeLabel,
  startOfMonth,
  startOfWeek
} from '@shared/dates'
import { getSettings } from './settings'

interface TotalsRow {
  total_in: number
  total_out: number
  count: number
}

const TOTALS_SELECT = `
  COALESCE(SUM(CASE direction WHEN 'in'  THEN amount ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE direction WHEN 'out' THEN amount ELSE 0 END), 0) AS total_out,
  COUNT(*) AS count
`

function periodTotals(db: Db, from: string, to: string): TotalsRow {
  return db
    .prepare(
      `SELECT ${TOTALS_SELECT} FROM transactions WHERE occurred_on BETWEEN ? AND ?`
    )
    .get(from, to) as TotalsRow
}

/**
 * Per-wallet breakdown. Includes archived wallets that have activity in the
 * period, so historical reports stay accurate after a wallet is archived.
 */
function walletBreakdown(db: Db, from: string, to: string): ReportBucket[] {
  const rows = db
    .prepare(
      `SELECT w.id AS id, w.name AS name,
              COALESCE(SUM(CASE t.direction WHEN 'in'  THEN t.amount ELSE 0 END), 0) AS total_in,
              COALESCE(SUM(CASE t.direction WHEN 'out' THEN t.amount ELSE 0 END), 0) AS total_out
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id
       WHERE t.occurred_on BETWEEN ? AND ?
       GROUP BY w.id
       ORDER BY w.name`
    )
    .all(from, to) as { id: number; name: string; total_in: number; total_out: number }[]

  return rows.map((r) => ({
    key: String(r.id),
    label: r.name,
    totalIn: r.total_in,
    totalOut: r.total_out,
    net: r.total_in - r.total_out
  }))
}

/** Totals per calendar day, keyed by date. Days without activity are omitted. */
function dailyTotals(db: Db, from: string, to: string): Map<string, TotalsRow> {
  const rows = db
    .prepare(
      `SELECT occurred_on, ${TOTALS_SELECT}
       FROM transactions
       WHERE occurred_on BETWEEN ? AND ?
       GROUP BY occurred_on`
    )
    .all(from, to) as (TotalsRow & { occurred_on: string })[]
  return new Map(rows.map((r) => [r.occurred_on, r]))
}

function buildReport(
  db: Db,
  from: string,
  to: string,
  label: string,
  byBucket: ReportBucket[]
): Report {
  const totals = periodTotals(db, from, to)
  return {
    from,
    to,
    label,
    totalIn: totals.total_in,
    totalOut: totals.total_out,
    net: totals.total_in - totals.total_out,
    count: totals.count,
    byWallet: walletBreakdown(db, from, to),
    byBucket
  }
}

/** The week containing `anchor`, bucketed by day. */
export function weeklyReport(db: Db, anchor: string): Report {
  const { weekStart } = getSettings(db)
  const from = startOfWeek(anchor, weekStart)
  const to = endOfWeek(anchor, weekStart)
  const daily = dailyTotals(db, from, to)

  const byBucket: ReportBucket[] = eachDay(from, to).map((day) => {
    const t = daily.get(day)
    const totalIn = t?.total_in ?? 0
    const totalOut = t?.total_out ?? 0
    return { key: day, label: dayLabel(day), totalIn, totalOut, net: totalIn - totalOut }
  })

  return buildReport(db, from, to, rangeLabel(from, to), byBucket)
}

/**
 * A calendar month, bucketed by week. The first and last buckets are clipped
 * to the month, so a week straddling a month boundary only contributes the
 * days that actually fall inside the month.
 */
export function monthlyReport(db: Db, year: number, month: number): Report {
  const { weekStart } = getSettings(db)
  const from = startOfMonth(year, month)
  const to = endOfMonth(year, month)
  const daily = dailyTotals(db, from, to)

  const byBucket: ReportBucket[] = []
  let cursor = from
  while (cursor <= to) {
    const weekEnd = endOfWeek(cursor, weekStart)
    const bucketEnd = weekEnd < to ? weekEnd : to
    let totalIn = 0
    let totalOut = 0
    for (const day of eachDay(cursor, bucketEnd)) {
      const t = daily.get(day)
      totalIn += t?.total_in ?? 0
      totalOut += t?.total_out ?? 0
    }
    byBucket.push({
      key: cursor,
      label: rangeLabel(cursor, bucketEnd),
      totalIn,
      totalOut,
      net: totalIn - totalOut
    })
    cursor = addDays(bucketEnd, 1)
  }

  return buildReport(db, from, to, monthLabel(year, month), byBucket)
}
