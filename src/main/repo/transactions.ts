import type { Db } from '../db'
import type { Transaction, TransactionFilter, TransactionInput } from '@shared/types'

interface TxnRow {
  id: number
  wallet_id: number
  wallet_name: string
  direction: 'in' | 'out'
  amount: number
  description: string
  occurred_on: string
  created_at: string
}

function toTransaction(row: TxnRow): Transaction {
  return {
    id: row.id,
    walletId: row.wallet_id,
    walletName: row.wallet_name,
    direction: row.direction,
    amount: row.amount,
    description: row.description,
    occurredOn: row.occurred_on,
    createdAt: row.created_at
  }
}

const SELECT_TXN = `
  SELECT t.id, t.wallet_id, w.name AS wallet_name, t.direction, t.amount,
         t.description, t.occurred_on, t.created_at
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
`

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function assertValid(input: TransactionInput): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be a positive whole number of minor units')
  }
  if (input.direction !== 'in' && input.direction !== 'out') {
    throw new Error(`Unknown direction: ${input.direction}`)
  }
  if (!ISO_DATE.test(input.occurredOn)) {
    throw new Error(`Date must be YYYY-MM-DD, got: ${input.occurredOn}`)
  }
}

export function listTransactions(db: Db, filter: TransactionFilter = {}): Transaction[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filter.walletId !== undefined) {
    clauses.push('t.wallet_id = ?')
    params.push(filter.walletId)
  }
  if (filter.direction !== undefined) {
    clauses.push('t.direction = ?')
    params.push(filter.direction)
  }
  if (filter.from !== undefined) {
    clauses.push('t.occurred_on >= ?')
    params.push(filter.from)
  }
  if (filter.to !== undefined) {
    clauses.push('t.occurred_on <= ?')
    params.push(filter.to)
  }
  if (filter.search) {
    clauses.push('t.description LIKE ?')
    params.push(`%${filter.search}%`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = filter.limit !== undefined ? 'LIMIT ?' : ''
  if (filter.limit !== undefined) params.push(filter.limit)

  const rows = db
    .prepare(`${SELECT_TXN} ${where} ORDER BY t.occurred_on DESC, t.id DESC ${limit}`)
    .all(...params) as TxnRow[]
  return rows.map(toTransaction)
}

export function getTransaction(db: Db, id: number): Transaction | null {
  const row = db.prepare(`${SELECT_TXN} WHERE t.id = ?`).get(id) as TxnRow | undefined
  return row ? toTransaction(row) : null
}

export function createTransaction(db: Db, input: TransactionInput): Transaction {
  assertValid(input)
  const info = db
    .prepare(
      `INSERT INTO transactions (wallet_id, direction, amount, description, occurred_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.walletId,
      input.direction,
      input.amount,
      input.description.trim(),
      input.occurredOn,
      new Date().toISOString()
    )
  return getTransaction(db, Number(info.lastInsertRowid))!
}

export function updateTransaction(db: Db, id: number, input: TransactionInput): Transaction {
  assertValid(input)
  const info = db
    .prepare(
      `UPDATE transactions
       SET wallet_id = ?, direction = ?, amount = ?, description = ?, occurred_on = ?
       WHERE id = ?`
    )
    .run(
      input.walletId,
      input.direction,
      input.amount,
      input.description.trim(),
      input.occurredOn,
      id
    )
  if (info.changes === 0) throw new Error(`Transaction ${id} not found`)
  return getTransaction(db, id)!
}

export function deleteTransaction(db: Db, id: number): void {
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
  if (info.changes === 0) throw new Error(`Transaction ${id} not found`)
}
