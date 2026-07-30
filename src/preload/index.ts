import { contextBridge, ipcRenderer } from 'electron'
import type {
  Report,
  Settings,
  Transaction,
  TransactionFilter,
  TransactionInput,
  WalletWithBalance
} from '../shared/types'

/**
 * The renderer's entire view of the main process. No ipcRenderer handle
 * escapes into the page — only these functions.
 */
const api = {
  wallets: {
    list: (includeArchived?: boolean): Promise<WalletWithBalance[]> =>
      ipcRenderer.invoke('wallets:list', includeArchived),
    create: (name: string): Promise<WalletWithBalance> => ipcRenderer.invoke('wallets:create', name),
    rename: (id: number, name: string): Promise<WalletWithBalance> =>
      ipcRenderer.invoke('wallets:rename', { id, name }),
    archive: (id: number, archived: boolean): Promise<WalletWithBalance> =>
      ipcRenderer.invoke('wallets:archive', { id, archived }),
    totalBalance: (): Promise<number> => ipcRenderer.invoke('wallets:totalBalance')
  },
  transactions: {
    list: (filter?: TransactionFilter): Promise<Transaction[]> =>
      ipcRenderer.invoke('transactions:list', filter),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke('transactions:create', input),
    update: (id: number, input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke('transactions:update', { id, input }),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('transactions:delete', id)
  },
  reports: {
    weekly: (anchor: string): Promise<Report> => ipcRenderer.invoke('reports:weekly', anchor),
    monthly: (year: number, month: number): Promise<Report> =>
      ipcRenderer.invoke('reports:monthly', { year, month })
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<Settings>): Promise<Settings> =>
      ipcRenderer.invoke('settings:update', patch)
  },
  app: {
    dbPath: (): Promise<string> => ipcRenderer.invoke('app:dbPath'),
    revealDb: (): Promise<void> => ipcRenderer.invoke('app:revealDb')
  }
}

export type KigomboApi = typeof api

contextBridge.exposeInMainWorld('api', api)
