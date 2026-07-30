export type Direction = 'in' | 'out'
export type WeekStart = 'monday' | 'sunday'

export interface Wallet {
  id: number
  name: string
  archivedAt: string | null
  createdAt: string
}

export interface WalletWithBalance extends Wallet {
  /** Minor units. sum(in) - sum(out) for this wallet. */
  balance: number
}

export interface Transaction {
  id: number
  walletId: number
  walletName: string
  direction: Direction
  /** Minor units, always positive. */
  amount: number
  description: string
  /** 'YYYY-MM-DD' */
  occurredOn: string
  createdAt: string
}

export interface TransactionInput {
  walletId: number
  direction: Direction
  amount: number
  description: string
  occurredOn: string
}

export interface TransactionFilter {
  walletId?: number
  direction?: Direction
  /** Inclusive 'YYYY-MM-DD' */
  from?: string
  /** Inclusive 'YYYY-MM-DD' */
  to?: string
  search?: string
  limit?: number
}

/** One row of a report breakdown — a wallet, a day, or a week. */
export interface ReportBucket {
  key: string
  label: string
  totalIn: number
  totalOut: number
  net: number
}

export interface Report {
  /** Inclusive start of the period, 'YYYY-MM-DD' */
  from: string
  /** Inclusive end of the period, 'YYYY-MM-DD' */
  to: string
  label: string
  totalIn: number
  totalOut: number
  net: number
  count: number
  byWallet: ReportBucket[]
  byBucket: ReportBucket[]
}

export interface Settings {
  currency: string
  weekStart: WeekStart
}
