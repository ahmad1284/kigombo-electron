import type { ReactNode } from 'react'
import type { Transaction } from '@shared/types'
import { Amount } from './Money'

/** Names an entry for screen readers: two rows on one date must not sound alike. */
function entryName(t: Transaction): string {
  return `${t.description || 'entry with no description'} on ${t.occurredOn}`
}

/**
 * The signature element: a double-column ledger. Money in and money out never
 * share a column, so the shape of a period is legible before you read a number.
 */
export function Ledger({
  rows,
  emptyMessage,
  onEdit,
  onDelete
}: {
  rows: Transaction[]
  emptyMessage: string
  onEdit?: (t: Transaction) => void
  onDelete?: (t: Transaction) => void
}): ReactNode {
  if (rows.length === 0) {
    return (
      <p className="border border-dashed border-rule-strong px-5 py-10 text-center text-ink-faint">
        {emptyMessage}
      </p>
    )
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b-2 border-ink text-[11px] tracking-[0.16em] text-ink-faint uppercase">
          <th className="w-28 py-2 font-normal">Date</th>
          <th className="py-2 font-normal">Description</th>
          <th className="w-32 py-2 font-normal">Wallet</th>
          <th className="w-36 py-2 text-right font-normal">In</th>
          <th className="w-36 py-2 text-right font-normal">Out</th>
          {(onEdit || onDelete) && <th className="w-24 py-2" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id} className="group border-b border-rule hover:bg-sheet-raised">
            <td className="tnum py-2.5 text-ink-soft">{t.occurredOn.slice(5)}</td>
            <td className="py-2.5 pr-4">
              {t.description || <span className="text-ink-faint">No description</span>}
            </td>
            <td className="py-2.5 text-ink-soft">{t.walletName}</td>
            <td className="py-2.5 text-right">
              {t.direction === 'in' ? <Amount minor={t.amount} tone="in" /> : null}
            </td>
            <td className="py-2.5 text-right">
              {t.direction === 'out' ? <Amount minor={t.amount} tone="out" /> : null}
            </td>
            {(onEdit || onDelete) && (
              <td className="py-2.5 text-right whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {onEdit && (
                  <button
                    onClick={() => onEdit(t)}
                    className="px-2 text-ink-soft hover:text-ink"
                    aria-label={`Edit ${entryName(t)}`}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(t)}
                    className="px-2 text-ink-soft hover:text-debit"
                    aria-label={`Delete ${entryName(t)}`}
                  >
                    Delete
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
