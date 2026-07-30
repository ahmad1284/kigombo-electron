import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Report } from '@shared/types'
import { addDays, addMonths, monthLabel, parseIsoDate, today } from '@shared/dates'
import { Ledger } from '../components/Ledger'
import { Balance } from '../components/Money'
import { BreakdownTable, BucketChart, TotalsRow } from '../components/Totals'
import { useLoaded } from '../lib/store'

type Tab = 'weekly' | 'monthly'

export function ReportsView(): ReactNode {
  const [tab, setTab] = useState<Tab>('weekly')

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
        <h2 className="font-display text-3xl">Reports</h2>
        <div className="flex gap-6">
          {(['weekly', 'monthly'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`text-[11px] tracking-[0.16em] uppercase ${
                tab === t ? 'text-ink underline underline-offset-8' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'weekly' ? <WeeklyReport /> : <MonthlyReport />}
    </div>
  )
}

function WeeklyReport(): ReactNode {
  const [anchor, setAnchor] = useState(today())
  const report = useLoaded(() => window.api.reports.weekly(anchor), [anchor])
  const rows = useLoaded(
    () =>
      report
        ? window.api.transactions.list({ from: report.from, to: report.to, limit: 500 })
        : Promise.resolve([]),
    [report?.from, report?.to]
  )

  return (
    <div className="space-y-8">
      <Period
        label={report?.label ?? '—'}
        onPrev={() => setAnchor(addDays(anchor, -7))}
        onNext={() => setAnchor(addDays(anchor, 7))}
        onToday={() => setAnchor(today())}
        todayLabel="This week"
      />
      {report && (
        <>
          <TotalsRow report={report} />
          <section>
            <h3 className="mb-3 font-display text-lg">Day by day</h3>
            <BucketChart buckets={report.byBucket} />
          </section>
          <BreakdownTable
            title="By wallet"
            buckets={report.byWallet}
            emptyMessage="No movement in this week."
          />
          <section>
            <h3 className="mb-2 font-display text-lg">Entries</h3>
            <Ledger rows={rows ?? []} emptyMessage="No entries in this week." />
          </section>
        </>
      )}
    </div>
  )
}

function MonthlyReport(): ReactNode {
  const [cursor, setCursor] = useState(today().slice(0, 7) + '-01')
  const date = parseIsoDate(cursor)
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const report = useLoaded(() => window.api.reports.monthly(year, month), [year, month])
  const previous = useLoaded(() => {
    const prev = parseIsoDate(addMonths(cursor, -1))
    return window.api.reports.monthly(prev.getFullYear(), prev.getMonth() + 1)
  }, [year, month])

  return (
    <div className="space-y-8">
      <Period
        label={monthLabel(year, month)}
        onPrev={() => setCursor(addMonths(cursor, -1))}
        onNext={() => setCursor(addMonths(cursor, 1))}
        onToday={() => setCursor(today().slice(0, 7) + '-01')}
        todayLabel="This month"
      />
      {report && (
        <>
          <TotalsRow report={report} />
          {previous && <Comparison current={report} previous={previous} />}
          <section>
            <h3 className="mb-3 font-display text-lg">Week by week</h3>
            <BucketChart buckets={report.byBucket} />
          </section>
          <BreakdownTable
            title="By week"
            buckets={report.byBucket}
            emptyMessage="No movement in this month."
          />
          <BreakdownTable
            title="By wallet"
            buckets={report.byWallet}
            emptyMessage="No movement in this month."
          />
        </>
      )}
    </div>
  )
}

function Comparison({ current, previous }: { current: Report; previous: Report }): ReactNode {
  const delta = current.net - previous.net
  return (
    <p className="border-l-2 border-brass pl-4 text-ink-soft">
      {previous.label} netted <Balance minor={previous.net} />.{' '}
      {delta === 0
        ? 'This month lands in exactly the same place.'
        : `This month is ${delta > 0 ? 'ahead' : 'behind'} by `}
      {delta !== 0 && <Balance minor={Math.abs(delta)} />}
      {delta !== 0 && '.'}
    </p>
  )
}

function Period({
  label,
  onPrev,
  onNext,
  onToday,
  todayLabel
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  todayLabel: string
}): ReactNode {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onPrev} className="border border-rule-strong px-3 py-1 hover:bg-sheet-raised">
        ‹ Earlier
      </button>
      <h3 className="font-display text-2xl">{label}</h3>
      <button onClick={onNext} className="border border-rule-strong px-3 py-1 hover:bg-sheet-raised">
        Later ›
      </button>
      <button onClick={onToday} className="text-brass hover:underline">
        {todayLabel}
      </button>
    </div>
  )
}
