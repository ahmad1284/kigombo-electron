import type { ReactNode } from 'react'
import { today } from '@shared/dates'
import { Ledger } from '../components/Ledger'
import { Balance } from '../components/Money'
import { TotalsRow } from '../components/Totals'
import { useLoaded, useStore } from '../lib/store'

export function Dashboard({ onAdd }: { onAdd: () => void }): ReactNode {
  const { wallets } = useStore()
  const anchor = today()

  const week = useLoaded(() => window.api.reports.weekly(anchor), [anchor])
  const recent = useLoaded(() => window.api.transactions.list({ limit: 8 }), [])
  const total = useLoaded(() => window.api.wallets.totalBalance(), [])

  return (
    <div className="space-y-10">
      <section className="border-b-2 border-ink pb-6">
        <p className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">On hand</p>
        <p className="mt-1 font-display text-5xl">
          {total === null ? '—' : <Balance minor={total} />}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {wallets.map((w) => (
            <div key={w.id}>
              <p className="text-ink-soft">{w.name}</p>
              <p className="text-lg">
                <Balance minor={w.balance} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">This week</h2>
          <p className="tnum text-ink-faint">{week?.label}</p>
        </div>
        {week && <TotalsRow report={week} />}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Latest entries</h2>
          <button onClick={onAdd} className="text-brass hover:underline">
            Add an entry
          </button>
        </div>
        <Ledger rows={recent ?? []} emptyMessage="Nothing recorded yet. Add your first entry." />
      </section>
    </div>
  )
}
