/**
 * Money lives as integer minor units everywhere except the input field and the
 * rendered string. These helpers are the only place the two representations meet.
 */

const fractionDigitsCache = new Map<string, number>()

export function fractionDigits(currency: string): number {
  const cached = fractionDigitsCache.get(currency)
  if (cached !== undefined) return cached
  let digits = 2
  try {
    digits =
      new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
  } catch {
    digits = 2
  }
  fractionDigitsCache.set(currency, digits)
  return digits
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** fractionDigits(currency))
}

export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** fractionDigits(currency)
}

/** "1,250.00" — no symbol, so it sits cleanly in a numeric column. */
export function formatAmount(minor: number, currency: string): string {
  const digits = fractionDigits(currency)
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(toMajor(minor, currency))
}

/** "USD 1,250.00", signed. Used for balances and totals. */
export function formatSigned(minor: number, currency: string): string {
  const sign = minor < 0 ? '−' : ''
  return `${sign}${currency} ${formatAmount(Math.abs(minor), currency)}`
}

/** Parses what the user typed. Returns null if it isn't a usable amount. */
export function parseAmount(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,]/g, '')
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  const minor = toMinor(Number(cleaned), currency)
  return minor > 0 ? minor : null
}
