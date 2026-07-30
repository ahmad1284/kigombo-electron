import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { StoreProvider } from './lib/store'
import { TransactionForm } from './components/TransactionForm'
import { Dashboard } from './views/Dashboard'
import { TransactionsView } from './views/TransactionsView'
import { ReportsView } from './views/ReportsView'
import { WalletsView } from './views/WalletsView'
import { SettingsView } from './views/SettingsView'

type View = 'dashboard' | 'entries' | 'reports' | 'wallets' | 'settings'

const NAV: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Ledger' },
  { id: 'entries', label: 'Entries' },
  { id: 'reports', label: 'Reports' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'settings', label: 'Settings' }
]

export default function App(): ReactNode {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function Shell(): ReactNode {
  const [view, setView] = useState<View>('dashboard')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setAdding(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full">
      <nav className="flex w-56 shrink-0 flex-col border-r border-rule-strong bg-sheet-raised">
        <div className="border-b border-rule px-6 py-6">
          <h1 className="font-display text-2xl tracking-tight">Kigombo</h1>
          <p className="mt-1 text-[11px] tracking-[0.16em] text-ink-faint uppercase">Cash ledger</p>
        </div>

        <ul className="flex-1 py-3">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
                className={`w-full border-l-2 px-6 py-2.5 text-left ${
                  view === item.id
                    ? 'border-brass bg-sheet text-ink'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-rule p-4">
          <button
            onClick={() => setAdding(true)}
            className="w-full bg-ink px-4 py-3 tracking-wide text-sheet uppercase hover:bg-ink-soft"
          >
            New entry
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-faint">Ctrl + N</p>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-10 py-10">
          {view === 'dashboard' && <Dashboard onAdd={() => setAdding(true)} />}
          {view === 'entries' && <TransactionsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'wallets' && <WalletsView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>

      {adding && <TransactionForm onClose={() => setAdding(false)} />}
    </div>
  )
}
