import { ipcMain, shell } from 'electron'
import { z } from 'zod'
import type { Db } from './db'
import {
  createWallet,
  listWallets,
  renameWallet,
  setWalletArchived,
  totalBalance
} from './repo/wallets'
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction
} from './repo/transactions'
import { monthlyReport, weeklyReport } from './repo/reports'
import { getSettings, updateSettings } from './repo/settings'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const id = z.number().int().positive()

const transactionInput = z.object({
  walletId: id,
  direction: z.enum(['in', 'out']),
  amount: z.number().int().positive(),
  description: z.string().max(500),
  occurredOn: isoDate
})

const transactionFilter = z.object({
  walletId: id.optional(),
  direction: z.enum(['in', 'out']).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  search: z.string().max(200).optional(),
  limit: z.number().int().positive().max(1000).optional()
})

const walletName = z.string().min(1).max(60)

/**
 * Registers one handler per operation. Every payload is parsed before it
 * reaches SQL — the renderer is untrusted input as far as the main process
 * is concerned.
 */
export function registerIpc(db: Db, dbPath: string): void {
  const handle = <S extends z.ZodTypeAny, R>(
    channel: string,
    schema: S,
    fn: (arg: z.infer<S>) => R
  ): void => {
    ipcMain.handle(channel, (_event, raw) => fn(schema.parse(raw)))
  }

  handle('wallets:list', z.boolean().optional(), (includeArchived) =>
    listWallets(db, includeArchived ?? false)
  )
  handle('wallets:create', walletName, (name) => createWallet(db, name))
  handle('wallets:rename', z.object({ id, name: walletName }), ({ id: walletId, name }) =>
    renameWallet(db, walletId, name)
  )
  handle('wallets:archive', z.object({ id, archived: z.boolean() }), ({ id: walletId, archived }) =>
    setWalletArchived(db, walletId, archived)
  )
  handle('wallets:totalBalance', z.undefined(), () => totalBalance(db))

  handle('transactions:list', transactionFilter.optional(), (filter) =>
    listTransactions(db, filter ?? {})
  )
  handle('transactions:create', transactionInput, (input) => createTransaction(db, input))
  handle(
    'transactions:update',
    z.object({ id, input: transactionInput }),
    ({ id: txnId, input }) => updateTransaction(db, txnId, input)
  )
  handle('transactions:delete', id, (txnId) => deleteTransaction(db, txnId))

  handle('reports:weekly', isoDate, (anchor) => weeklyReport(db, anchor))
  handle(
    'reports:monthly',
    z.object({ year: z.number().int().min(1970).max(9999), month: z.number().int().min(1).max(12) }),
    ({ year, month }) => monthlyReport(db, year, month)
  )

  handle('settings:get', z.undefined(), () => getSettings(db))
  handle(
    'settings:update',
    z.object({
      currency: z.string().optional(),
      weekStart: z.enum(['monday', 'sunday']).optional()
    }),
    (patch) => updateSettings(db, patch)
  )

  handle('app:dbPath', z.undefined(), () => dbPath)
  handle('app:revealDb', z.undefined(), () => {
    shell.showItemInFolder(dbPath)
  })
}
