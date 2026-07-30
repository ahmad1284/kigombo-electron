import { describe, expect, it } from 'vitest'
import { formatSigned, parseAmount, toMajor, toMinor } from './money'

describe('money', () => {
  it('round-trips major and minor units', () => {
    expect(toMinor(12.34, 'USD')).toBe(1234)
    expect(toMajor(1234, 'USD')).toBe(12.34)
  })

  it('handles zero-decimal currencies', () => {
    expect(toMinor(1500, 'JPY')).toBe(1500)
    expect(toMajor(1500, 'JPY')).toBe(1500)
  })

  it('avoids float drift on cents', () => {
    expect(toMinor(0.1 + 0.2, 'USD')).toBe(30)
  })

  it('parses input with separators and rejects junk', () => {
    expect(parseAmount('1,250.50', 'USD')).toBe(125050)
    expect(parseAmount('  25 ', 'USD')).toBe(2500)
    expect(parseAmount('0', 'USD')).toBeNull()
    expect(parseAmount('-5', 'USD')).toBeNull()
    expect(parseAmount('abc', 'USD')).toBeNull()
    expect(parseAmount('', 'USD')).toBeNull()
  })

  it('marks negative balances with a real minus sign', () => {
    expect(formatSigned(-2500, 'USD')).toBe('−USD 25.00')
  })
})
