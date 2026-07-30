import type { ReactNode } from 'react'
import type { Report, ReportBucket } from '@shared/types'
import { formatAmount } from '../lib/money'
import { useStore } from '../lib/store'
import { Balance } from './Money'

/** The three numbers that answer "how did this period go". */
export function TotalsRow({ report }: { report: Report }): ReactNode {
  const { settings } = useStore()
  return (
    <dl className="grid grid-cols-3 gap-px border border-rule-strong bg-rule-strong">
      <Cell label="In" value={formatAmount(report.totalIn, settings.currency)} tone="text-credit" />
      <Cell
        label="Out"
        value={formatAmount(report.totalOut, settings.currency)}
        tone="text-debit"
      />
      <div className="bg-sheet-raised px-5 py-4">
        <dt className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Net</dt>
        <dd className="mt-1 text-2xl">
          <Balance minor={report.net} />
        </dd>
      </div>
    </dl>
  )
}

function Cell({ label, value, tone }: { label: string; value: string; tone: string }): ReactNode {
  return (
    <div className="bg-sheet-raised px-5 py-4">
      <dt className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">{label}</dt>
      <dd className={`tnum mt-1 text-2xl ${tone}`}>{value}</dd>
    </div>
  )
}

/**
 * A ruled bar chart: each bucket gets a green bar up and a red bar down from a
 * shared baseline, scaled to the largest movement in the period.
 */
export function BucketChart({ buckets }: { buckets: ReportBucket[] }): ReactNode {
  const { settings } = useStore()
  const peak = Math.max(1, ...buckets.map((b) => Math.max(b.totalIn, b.totalOut)))
  // A small day next to a large one still has to be visible, so non-zero bars
  // get a floor of a few pixels rather than rounding away to nothing.
  const bar = (value: number): string => (value === 0 ? '0' : `max(3px, ${(value / peak) * 100}%)`)

  return (
    <div className="flex items-stretch gap-1">
      {buckets.map((b) => (
        <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-20 w-full items-end justify-center">
            <div
              className="w-full max-w-10 bg-credit"
              style={{ height: bar(b.totalIn) }}
              title={`In ${formatAmount(b.totalIn, settings.currency)}`}
            />
          </div>
          <div className="h-px w-full bg-rule-strong" />
          <div className="flex h-20 w-full items-start justify-center">
            <div
              className="w-full max-w-10 bg-debit"
              style={{ height: bar(b.totalOut) }}
              title={`Out ${formatAmount(b.totalOut, settings.currency)}`}
            />
          </div>
          <span className="mt-1 text-center text-[11px] leading-tight text-ink-faint">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Per-wallet or per-period breakdown, in the same two-column ledger shape. */
export function BreakdownTable({
  title,
  buckets,
  emptyMessage
}: {
  title: string
  buckets: ReportBucket[]
  emptyMessage: string
}): ReactNode {
  const { settings } = useStore()

  return (
    <section>
      <h3 className="mb-2 font-display text-lg">{title}</h3>
      {buckets.length === 0 ? (
        <p className="border border-dashed border-rule-strong px-5 py-6 text-center text-ink-faint">
          {emptyMessage}
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-ink text-[11px] tracking-[0.16em] text-ink-faint uppercase">
              <th className="py-2 text-left font-normal">{title.includes('wallet') ? 'Wallet' : 'Period'}</th>
              <th className="w-36 py-2 text-right font-normal">In</th>
              <th className="w-36 py-2 text-right font-normal">Out</th>
              <th className="w-40 py-2 text-right font-normal">Net</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-b border-rule">
                <td className="py-2.5">{b.label}</td>
                <td className="tnum py-2.5 text-right text-credit">
                  {b.totalIn ? formatAmount(b.totalIn, settings.currency) : '—'}
                </td>
                <td className="tnum py-2.5 text-right text-debit">
                  {b.totalOut ? formatAmount(b.totalOut, settings.currency) : '—'}
                </td>
                <td className="py-2.5 text-right">
                  <Balance minor={b.net} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
