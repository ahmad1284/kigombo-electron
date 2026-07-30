import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Settings, WalletWithBalance } from '@shared/types'

interface Store {
  settings: Settings
  wallets: WalletWithBalance[]
  /** Bumped whenever data changes, so views can re-fetch what they show. */
  revision: number
  refresh: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(async () => {
    const [nextSettings, nextWallets] = await Promise.all([
      window.api.settings.get(),
      window.api.wallets.list()
    ])
    setSettings(nextSettings)
    setWallets(nextWallets)
    setRevision((n) => n + 1)
  }, [])

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings(await window.api.settings.update(patch))
      setRevision((n) => n + 1)
    },
    []
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<Store | null>(
    () => (settings ? { settings, wallets, revision, refresh, saveSettings } : null),
    [settings, wallets, revision, refresh, saveSettings]
  )

  if (!value) return null
  return <StoreContext value={value}>{children}</StoreContext>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}

/** Re-runs `load` whenever the data revision changes. */
export function useLoaded<T>(load: () => Promise<T>, deps: unknown[]): T | null {
  const { revision } = useStore()
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    let live = true
    void load().then((result) => {
      if (live) setValue(result)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, ...deps])

  return value
}
