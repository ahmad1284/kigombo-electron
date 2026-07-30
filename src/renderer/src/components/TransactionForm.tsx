import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Direction, Transaction } from '@shared/types'
import { today } from '@shared/dates'
import { parseAmount, toMajor } from '../lib/money'
import { useStore } from '../lib/store'

interface Props {
  /** Present when editing; absent when adding. */
  editing?: Transaction | null
  onClose: () => void
}

/**
 * The entry slip. Opens over the ledger, keeps focus in the amount field, and
 * stays open after saving a new entry so several can be logged in a row.
 */
export function TransactionForm({ editing, onClose }: Props): ReactNode {
  const { wallets, settings, refresh } = useStore()
  const amountRef = useRef<HTMLInputElement>(null)

  const [direction, setDirection] = useState<Direction>(editing?.direction ?? 'out')
  const [amount, setAmount] = useState(
    editing ? String(toMajor(editing.amount, settings.currency)) : ''
  )
  const [walletId, setWalletId] = useState(editing?.walletId ?? wallets[0]?.id ?? 0)
  const [description, setDescription] = useState(editing?.description ?? '')
  const [occurredOn, setOccurredOn] = useState(editing?.occurredOn ?? today())
  const [error, setError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const minor = parseAmount(amount, settings.currency)
    if (minor === null) {
      setError('Enter an amount greater than zero.')
      amountRef.current?.focus()
      return
    }
    if (!walletId) {
      setError('Choose a wallet.')
      return
    }

    const input = { walletId, direction, amount: minor, description, occurredOn }
    try {
      if (editing) {
        await window.api.transactions.update(editing.id, input)
        await refresh()
        onClose()
        return
      }
      await window.api.transactions.create(input)
      await refresh()
      setSavedNote(`Recorded ${direction === 'in' ? 'money in' : 'money out'}.`)
      setAmount('')
      setDescription('')
      amountRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const tone = direction === 'in' ? 'text-credit' : 'text-debit'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/35 px-6 py-16 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg border border-rule-strong bg-sheet-raised shadow-2xl"
        aria-label={editing ? 'Edit entry' : 'New entry'}
      >
        <header className="flex items-baseline justify-between border-b border-rule px-6 py-4">
          <h2 className="font-display text-xl">{editing ? 'Edit entry' : 'New entry'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            Esc
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-px border border-rule-strong bg-rule-strong">
            {(['in', 'out'] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
                className={`px-4 py-3 text-sm tracking-wide uppercase transition-colors ${
                  direction === d
                    ? d === 'in'
                      ? 'bg-credit text-sheet'
                      : 'bg-debit text-sheet'
                    : 'bg-sheet-raised text-ink-soft hover:text-ink'
                }`}
              >
                {d === 'in' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-xs tracking-[0.14em] text-ink-faint uppercase">
              Amount ({settings.currency})
            </span>
            <input
              ref={amountRef}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className={`tnum mt-1 w-full border-b-2 border-rule-strong bg-transparent py-2 text-3xl outline-none focus:border-brass ${tone}`}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs tracking-[0.14em] text-ink-faint uppercase">Wallet</span>
              <select
                value={walletId}
                onChange={(e) => setWalletId(Number(e.target.value))}
                className="mt-1 w-full border border-rule-strong bg-sheet px-3 py-2 text-ink"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs tracking-[0.14em] text-ink-faint uppercase">Date</span>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="tnum mt-1 w-full border border-rule-strong bg-sheet px-3 py-2 text-ink"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs tracking-[0.14em] text-ink-faint uppercase">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was it for?"
              className="mt-1 w-full border border-rule-strong bg-sheet px-3 py-2 text-ink placeholder:text-ink-faint"
            />
          </label>

          {error && (
            <p role="alert" className="text-debit">
              {error}
            </p>
          )}
          {!error && savedNote && (
            <p role="status" className="text-ink-soft">
              {savedNote} Add another, or press Esc to close.
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-rule px-6 py-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-ink-soft hover:text-ink">
            Cancel
          </button>
          <button
            type="submit"
            className="bg-ink px-6 py-2 tracking-wide text-sheet uppercase hover:bg-ink-soft"
          >
            {editing ? 'Save changes' : 'Record entry'}
          </button>
        </footer>
      </form>
    </div>
  )
}
