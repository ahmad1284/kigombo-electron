import type { Db } from '../db'
import type { Wallet, WalletWithBalance } from '@shared/types'

interface WalletRow {
  id: number
  name: string
  archived_at: string | null
  created_at: string
  balance: number
}

function toWallet(row: WalletRow): WalletWithBalance {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    balance: row.balance
  }
}

const SELECT_WITH_BALANCE = `
  SELECT w.id, w.name, w.archived_at, w.created_at,
         COALESCE(SUM(CASE t.direction WHEN 'in' THEN t.amount ELSE -t.amount END), 0) AS balance
  FROM wallets w
  LEFT JOIN transactions t ON t.wallet_id = w.id
`

export function listWallets(db: Db, includeArchived = false): WalletWithBalance[] {
  const where = includeArchived ? '' : 'WHERE w.archived_at IS NULL'
  const rows = db
    .prepare(`${SELECT_WITH_BALANCE} ${where} GROUP BY w.id ORDER BY w.archived_at IS NOT NULL, w.name`)
    .all() as WalletRow[]
  return rows.map(toWallet)
}

export function getWallet(db: Db, id: number): WalletWithBalance | null {
  const row = db.prepare(`${SELECT_WITH_BALANCE} WHERE w.id = ? GROUP BY w.id`).get(id) as
    | WalletRow
    | undefined
  return row ? toWallet(row) : null
}

export function createWallet(db: Db, name: string): WalletWithBalance {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Wallet name cannot be empty')
  const info = db
    .prepare('INSERT INTO wallets (name, created_at) VALUES (?, ?)')
    .run(trimmed, new Date().toISOString())
  return getWallet(db, Number(info.lastInsertRowid))!
}

export function renameWallet(db: Db, id: number, name: string): WalletWithBalance {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Wallet name cannot be empty')
  db.prepare('UPDATE wallets SET name = ? WHERE id = ?').run(trimmed, id)
  const wallet = getWallet(db, id)
  if (!wallet) throw new Error(`Wallet ${id} not found`)
  return wallet
}

/**
 * Wallets are archived rather than deleted so historical transactions keep a
 * valid reference. Archived wallets stay out of pickers but still appear in
 * reports covering periods where they were used.
 */
export function setWalletArchived(db: Db, id: number, archived: boolean): WalletWithBalance {
  db.prepare('UPDATE wallets SET archived_at = ? WHERE id = ?').run(
    archived ? new Date().toISOString() : null,
    id
  )
  const wallet = getWallet(db, id)
  if (!wallet) throw new Error(`Wallet ${id} not found`)
  return wallet
}

export function totalBalance(db: Db): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CASE t.direction WHEN 'in' THEN t.amount ELSE -t.amount END), 0) AS balance
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id
       WHERE w.archived_at IS NULL`
    )
    .get() as { balance: number }
  return row.balance
}

export type { Wallet }
