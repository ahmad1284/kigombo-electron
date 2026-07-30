import { useState } from 'react'
import type { ReactNode } from 'react'
import type { WeekStart } from '@shared/types'
import { useLoaded, useStore } from '../lib/store'

export function SettingsView(): ReactNode {
  const { settings, saveSettings } = useStore()
  const dbPath = useLoaded(() => window.api.app.dbPath(), [])
  const [currency, setCurrency] = useState(settings.currency)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submitCurrency(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await saveSettings({ currency })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <h2 className="font-display text-3xl">Settings</h2>

      <form onSubmit={submitCurrency} className="space-y-2">
        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Currency</span>
          <div className="mt-1 flex gap-3">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="tnum w-28 border border-rule-strong bg-sheet px-3 py-2 uppercase"
            />
            <button
              type="submit"
              className="bg-ink px-5 py-2 tracking-wide text-sheet uppercase hover:bg-ink-soft"
            >
              Save
            </button>
          </div>
        </label>
        <p className="text-ink-soft">
          Three-letter code, e.g. USD, EUR, IDR. Amounts already recorded keep their numbers.
        </p>
        {error && (
          <p role="alert" className="text-debit">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-credit">
            Currency saved.
          </p>
        )}
      </form>

      <div className="space-y-2">
        <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Weeks start on</span>
        <div className="flex gap-px border border-rule-strong bg-rule-strong">
          {(['monday', 'sunday'] as WeekStart[]).map((d) => (
            <button
              key={d}
              onClick={() => void saveSettings({ weekStart: d })}
              aria-pressed={settings.weekStart === d}
              className={`flex-1 px-4 py-2 capitalize ${
                settings.weekStart === d
                  ? 'bg-ink text-sheet'
                  : 'bg-sheet-raised text-ink-soft hover:text-ink'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="text-ink-soft">Weekly reports and month sub-totals follow this choice.</p>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] tracking-[0.16em] text-ink-faint uppercase">Your data</span>
        <p className="tnum break-all text-ink-soft">{dbPath ?? '—'}</p>
        <button
          onClick={() => void window.api.app.revealDb()}
          className="border border-rule-strong px-4 py-2 hover:bg-sheet-raised"
        >
          Show in file manager
        </button>
        <p className="text-ink-soft">
          One SQLite file, on this machine only. Copy it to back up; nothing leaves the app.
        </p>
      </div>
    </div>
  )
}
