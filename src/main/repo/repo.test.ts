import { beforeEach, describe, expect, it } from 'vitest'
import { openTestDatabase, type Db } from '../db'
import {
  createWallet,
  listWallets,
  renameWallet,
  setWalletArchived,
  totalBalance
} from './wallets'
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction
} from './transactions'
import { monthlyReport, weeklyReport } from './reports'
import { getSettings, updateSettings } from './settings'

let db: Db

beforeEach(() => {
  db = openTestDatabase()
})

function cash(): number {
  return listWallets(db)[0].id
}

describe('migrations and seeding', () => {
  it('creates a Cash wallet and default settings on first open', () => {
    const wallets = listWallets(db)
    expect(wallets).toHaveLength(1)
    expect(wallets[0].name).toBe('Cash')
    expect(wallets[0].balance).toBe(0)
    expect(getSettings(db)).toEqual({ currency: 'USD', weekStart: 'monday' })
  })

  it('is idempotent — reopening does not duplicate seeds', () => {
    const again = openTestDatabase()
    expect(listWallets(again)).toHaveLength(1)
  })
})

describe('wallets', () => {
  it('computes balance as in minus out', () => {
    const id = cash()
    createTransaction(db, {
      walletId: id,
      direction: 'in',
      amount: 100_000,
      description: 'salary',
      occurredOn: '2025-03-05'
    })
    createTransaction(db, {
      walletId: id,
      direction: 'out',
      amount: 25_000,
      description: 'groceries',
      occurredOn: '2025-03-06'
    })
    expect(listWallets(db)[0].balance).toBe(75_000)
    expect(totalBalance(db)).toBe(75_000)
  })

  it('rejects an empty name', () => {
    expect(() => createWallet(db, '   ')).toThrow(/empty/)
  })

  it('rejects a duplicate name', () => {
    createWallet(db, 'Bank')
    expect(() => createWallet(db, 'Bank')).toThrow()
  })

  it('renames a wallet', () => {
    const w = createWallet(db, 'Bank')
    expect(renameWallet(db, w.id, 'Savings').name).toBe('Savings')
  })

  it('hides archived wallets from the default list but keeps them retrievable', () => {
    const w = createWallet(db, 'Bank')
    setWalletArchived(db, w.id, true)
    expect(listWallets(db).map((x) => x.name)).toEqual(['Cash'])
    expect(listWallets(db, true).map((x) => x.name)).toEqual(['Cash', 'Bank'])
  })

  it('excludes archived wallets from the total balance', () => {
    const bank = createWallet(db, 'Bank')
    createTransaction(db, {
      walletId: bank.id,
      direction: 'in',
      amount: 50_000,
      description: '',
      occurredOn: '2025-03-05'
    })
    expect(totalBalance(db)).toBe(50_000)
    setWalletArchived(db, bank.id, true)
    expect(totalBalance(db)).toBe(0)
  })
})

describe('transactions', () => {
  it('rejects a non-positive amount', () => {
    const walletId = cash()
    for (const amount of [0, -1]) {
      expect(() =>
        createTransaction(db, {
          walletId,
          direction: 'out',
          amount,
          description: '',
          occurredOn: '2025-03-05'
        })
      ).toThrow(/positive/)
    }
  })

  it('rejects a fractional amount — money is stored in minor units', () => {
    expect(() =>
      createTransaction(db, {
        walletId: cash(),
        direction: 'in',
        amount: 10.5,
        description: '',
        occurredOn: '2025-03-05'
      })
    ).toThrow(/whole number/)
  })

  it('rejects a malformed date', () => {
    expect(() =>
      createTransaction(db, {
        walletId: cash(),
        direction: 'in',
        amount: 100,
        description: '',
        occurredOn: '05/03/2025'
      })
    ).toThrow(/YYYY-MM-DD/)
  })

  it('filters by wallet, direction, date range and description', () => {
    const a = cash()
    const b = createWallet(db, 'Bank').id
    createTransaction(db, {
      walletId: a,
      direction: 'in',
      amount: 100,
      description: 'coffee money',
      occurredOn: '2025-03-01'
    })
    createTransaction(db, {
      walletId: b,
      direction: 'out',
      amount: 200,
      description: 'coffee beans',
      occurredOn: '2025-03-10'
    })
    createTransaction(db, {
      walletId: b,
      direction: 'out',
      amount: 300,
      description: 'rent',
      occurredOn: '2025-04-01'
    })

    expect(listTransactions(db, { walletId: b })).toHaveLength(2)
    expect(listTransactions(db, { direction: 'in' })).toHaveLength(1)
    expect(listTransactions(db, { from: '2025-03-01', to: '2025-03-31' })).toHaveLength(2)
    expect(listTransactions(db, { search: 'coffee' })).toHaveLength(2)
    expect(listTransactions(db, { limit: 1 })).toHaveLength(1)
  })

  it('returns newest first', () => {
    const walletId = cash()
    createTransaction(db, {
      walletId,
      direction: 'in',
      amount: 100,
      description: 'older',
      occurredOn: '2025-03-01'
    })
    createTransaction(db, {
      walletId,
      direction: 'in',
      amount: 100,
      description: 'newer',
      occurredOn: '2025-03-09'
    })
    expect(listTransactions(db).map((t) => t.description)).toEqual(['newer', 'older'])
  })

  it('updates and deletes', () => {
    const walletId = cash()
    const t = createTransaction(db, {
      walletId,
      direction: 'out',
      amount: 25_000,
      description: 'groceries',
      occurredOn: '2025-03-06'
    })
    const updated = updateTransaction(db, t.id, {
      walletId,
      direction: 'out',
      amount: 30_000,
      description: 'groceries + snacks',
      occurredOn: '2025-03-06'
    })
    expect(updated.amount).toBe(30_000)
    expect(listWallets(db)[0].balance).toBe(-30_000)

    deleteTransaction(db, t.id)
    expect(listTransactions(db)).toHaveLength(0)
    expect(listWallets(db)[0].balance).toBe(0)
    expect(() => deleteTransaction(db, t.id)).toThrow(/not found/)
  })

  it('carries the wallet name for display', () => {
    const bank = createWallet(db, 'Bank')
    createTransaction(db, {
      walletId: bank.id,
      direction: 'in',
      amount: 100,
      description: '',
      occurredOn: '2025-03-05'
    })
    expect(listTransactions(db)[0].walletName).toBe('Bank')
  })
})

describe('weekly report', () => {
  // 2025-03-05 is a Wednesday. Monday-start week: Mar 3 – Mar 9.
  it('covers the week containing the anchor date', () => {
    const r = weeklyReport(db, '2025-03-05')
    expect(r.from).toBe('2025-03-03')
    expect(r.to).toBe('2025-03-09')
    expect(r.byBucket).toHaveLength(7)
  })

  it('honours a sunday week start', () => {
    updateSettings(db, { weekStart: 'sunday' })
    const r = weeklyReport(db, '2025-03-05')
    expect(r.from).toBe('2025-03-02')
    expect(r.to).toBe('2025-03-08')
  })

  it('totals only transactions inside the week', () => {
    const walletId = cash()
    const add = (amount: number, direction: 'in' | 'out', occurredOn: string): void => {
      createTransaction(db, { walletId, direction, amount, description: '', occurredOn })
    }
    add(100_000, 'in', '2025-03-03') // Monday, inside
    add(25_000, 'out', '2025-03-09') // Sunday, inside
    add(999_999, 'in', '2025-03-10') // next week, outside

    const r = weeklyReport(db, '2025-03-05')
    expect(r.totalIn).toBe(100_000)
    expect(r.totalOut).toBe(25_000)
    expect(r.net).toBe(75_000)
    expect(r.count).toBe(2)
  })

  it('returns zeros, not nulls, for an empty week', () => {
    const r = weeklyReport(db, '2025-03-05')
    expect(r).toMatchObject({ totalIn: 0, totalOut: 0, net: 0, count: 0 })
    expect(r.byWallet).toEqual([])
    expect(r.byBucket.every((b) => b.totalIn === 0 && b.totalOut === 0)).toBe(true)
  })

  it('works across a year boundary', () => {
    const walletId = cash()
    createTransaction(db, {
      walletId,
      direction: 'in',
      amount: 500,
      description: 'nye',
      occurredOn: '2024-12-31'
    })
    const r = weeklyReport(db, '2025-01-01')
    expect(r.from).toBe('2024-12-30')
    expect(r.to).toBe('2025-01-05')
    expect(r.totalIn).toBe(500)
  })
})

describe('monthly report', () => {
  it('spans the whole calendar month', () => {
    const r = monthlyReport(db, 2025, 3)
    expect(r.from).toBe('2025-03-01')
    expect(r.to).toBe('2025-03-31')
    expect(r.label).toBe('March 2025')
  })

  it('handles February in a leap year', () => {
    expect(monthlyReport(db, 2024, 2).to).toBe('2024-02-29')
  })

  it('clips week buckets to the month boundary', () => {
    const walletId = cash()
    // Mar 31 2025 is a Monday — its week runs into April.
    createTransaction(db, {
      walletId,
      direction: 'out',
      amount: 1_000,
      description: 'last day of march',
      occurredOn: '2025-03-31'
    })
    createTransaction(db, {
      walletId,
      direction: 'out',
      amount: 7_000,
      description: 'april, same week',
      occurredOn: '2025-04-01'
    })

    const march = monthlyReport(db, 2025, 3)
    expect(march.totalOut).toBe(1_000)
    const lastBucket = march.byBucket[march.byBucket.length - 1]
    expect(lastBucket.key).toBe('2025-03-31')
    expect(lastBucket.totalOut).toBe(1_000)

    const april = monthlyReport(db, 2025, 4)
    expect(april.totalOut).toBe(7_000)
    expect(april.byBucket[0].key).toBe('2025-04-01')
  })

  it('buckets cover every day of the month exactly once', () => {
    const r = monthlyReport(db, 2025, 3)
    expect(r.byBucket[0].key).toBe('2025-03-01')
    for (let i = 1; i < r.byBucket.length; i++) {
      expect(r.byBucket[i].key > r.byBucket[i - 1].key).toBe(true)
    }
  })

  it('breaks totals down per wallet', () => {
    const a = cash()
    const b = createWallet(db, 'Bank').id
    createTransaction(db, {
      walletId: a,
      direction: 'out',
      amount: 25_000,
      description: '',
      occurredOn: '2025-03-06'
    })
    createTransaction(db, {
      walletId: b,
      direction: 'in',
      amount: 100_000,
      description: '',
      occurredOn: '2025-03-06'
    })

    const r = monthlyReport(db, 2025, 3)
    expect(r.byWallet).toEqual([
      { key: String(b), label: 'Bank', totalIn: 100_000, totalOut: 0, net: 100_000 },
      { key: String(a), label: 'Cash', totalIn: 0, totalOut: 25_000, net: -25_000 }
    ])
  })

  it('still counts an archived wallet in historical reports', () => {
    const bank = createWallet(db, 'Bank')
    createTransaction(db, {
      walletId: bank.id,
      direction: 'in',
      amount: 100_000,
      description: '',
      occurredOn: '2025-03-06'
    })
    setWalletArchived(db, bank.id, true)

    const r = monthlyReport(db, 2025, 3)
    expect(r.totalIn).toBe(100_000)
    expect(r.byWallet.map((w) => w.label)).toEqual(['Bank'])
  })
})

describe('settings', () => {
  it('round-trips currency and week start', () => {
    expect(updateSettings(db, { currency: 'idr', weekStart: 'sunday' })).toEqual({
      currency: 'IDR',
      weekStart: 'sunday'
    })
    expect(getSettings(db)).toEqual({ currency: 'IDR', weekStart: 'sunday' })
  })

  it('rejects a malformed currency code', () => {
    expect(() => updateSettings(db, { currency: 'dollars' })).toThrow(/3-letter/)
  })
})
