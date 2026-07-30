import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Direction, Transaction } from '@shared/types'
import { Ledger } from '../components/Ledger'
import { TransactionForm } from '../components/TransactionForm'
import { useLoaded, useStore } from '../lib/store'

export function TransactionsView(): ReactNode {
  const { wallets, refresh } = useStore()

  const [walletId, setWalletId] = useState<number | ''>('')
  const [direction, setDirection] = useState<Direction | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)

  const rows = useLoaded(
    () =>
      window.api.transactions.list({
        walletId: walletId === '' ? undefined : walletId,
        direction: direction === '' ? undefined : direction,
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
        limit: 500
      }),
    [walletId, direction, from, to, search]
  )

  async function remove(t: Transaction): Promise<void> {
    await window.api.transactions.remove(t.id)
    await refresh()
  }

  const field = 'border border-rule-strong bg-sheet px-3 py-2 text-ink'

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">All entries</h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Wallet</span>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value === '' ? '' : Number(e.target.value))}
            className={field}
          >
            <option value="">All wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction | '')}
            className={field}
          >
            <option value="">In and out</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`tnum ${field}`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`tnum ${field}`}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Description contains…"
            className={`${field} placeholder:text-ink-faint`}
          />
        </label>
      </div>

      <Ledger
        rows={rows ?? []}
        emptyMessage="No entries match these filters."
        onEdit={setEditing}
        onDelete={remove}
      />

      {editing && <TransactionForm editing={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
