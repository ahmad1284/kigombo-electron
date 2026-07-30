import type { ReactNode } from 'react'
import { formatAmount, formatSigned } from '../lib/money'
import { useStore } from '../lib/store'

/** A bare amount in the ledger's numeric column. */
export function Amount({ minor, tone }: { minor: number; tone: 'in' | 'out' }): ReactNode {
  const { settings } = useStore()
  return (
    <span className={`tnum ${tone === 'in' ? 'text-credit' : 'text-debit'}`}>
      {formatAmount(minor, settings.currency)}
    </span>
  )
}

/** A balance or net, carrying its sign and currency code. */
export function Balance({
  minor,
  className = ''
}: {
  minor: number
  className?: string
}): ReactNode {
  const { settings } = useStore()
  const tone = minor > 0 ? 'text-credit' : minor < 0 ? 'text-debit' : 'text-ink-soft'
  return <span className={`tnum ${tone} ${className}`}>{formatSigned(minor, settings.currency)}</span>
}
