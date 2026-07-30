import { useState } from 'react'
import type { ReactNode } from 'react'
import type { WalletWithBalance } from '@shared/types'
import { Balance } from '../components/Money'
import { useLoaded, useStore } from '../lib/store'

export function WalletsView(): ReactNode {
  const { refresh } = useStore()
  const wallets = useLoaded(() => window.api.wallets.list(true), [])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [draftName, setDraftName] = useState('')

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!name.trim()) return
    await run(async () => {
      await window.api.wallets.create(name)
      setName('')
    })
  }

  async function commitRename(w: WalletWithBalance): Promise<void> {
    await run(async () => {
      await window.api.wallets.rename(w.id, draftName)
      setRenaming(null)
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">Wallets</h2>

      <form onSubmit={add} className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name a new wallet"
          className="flex-1 border border-rule-strong bg-sheet px-3 py-2 placeholder:text-ink-faint"
        />
        <button
          type="submit"
          className="bg-ink px-5 py-2 tracking-wide text-sheet uppercase hover:bg-ink-soft"
        >
          Add wallet
        </button>
      </form>

      {error && (
        <p role="alert" className="text-debit">
          {error}
        </p>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-ink text-[11px] tracking-[0.16em] text-ink-faint uppercase">
            <th className="py-2 text-left font-normal">Wallet</th>
            <th className="w-48 py-2 text-right font-normal">Balance</th>
            <th className="w-56 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody>
          {(wallets ?? []).map((w) => (
            <tr key={w.id} className="border-b border-rule">
              <td className="py-3">
                {renaming === w.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(w)
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                    onBlur={() => void commitRename(w)}
                    className="border border-rule-strong bg-sheet px-2 py-1"
                    aria-label={`New name for ${w.name}`}
                  />
                ) : (
                  <>
                    {w.name}
                    {w.archivedAt && (
                      <span className="ml-2 text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                        Archived
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className="py-3 text-right">
                <Balance minor={w.balance} />
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => {
                    setRenaming(w.id)
                    setDraftName(w.name)
                  }}
                  className="px-2 text-ink-soft hover:text-ink"
                >
                  Rename
                </button>
                <button
                  onClick={() => void run(() => window.api.wallets.archive(w.id, !w.archivedAt))}
                  className="px-2 text-ink-soft hover:text-ink"
                >
                  {w.archivedAt ? 'Restore' : 'Archive'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-ink-soft">
        Archiving hides a wallet from pickers and the on-hand total. Its past entries stay in
        reports, so history never changes shape.
      </p>
    </div>
  )
}
