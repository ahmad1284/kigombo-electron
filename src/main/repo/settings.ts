import type { Db } from '../db'
import type { Settings, WeekStart } from '@shared/types'

export function getSettings(db: Db): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const weekStart = map.get('week_start')
  return {
    currency: map.get('currency') ?? 'USD',
    weekStart: weekStart === 'sunday' ? 'sunday' : 'monday'
  }
}

export function updateSettings(db: Db, patch: Partial<Settings>): Settings {
  const write = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  if (patch.currency !== undefined) {
    const currency = patch.currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a 3-letter code')
    write.run('currency', currency)
  }
  if (patch.weekStart !== undefined) {
    const weekStart: WeekStart = patch.weekStart === 'sunday' ? 'sunday' : 'monday'
    write.run('week_start', weekStart)
  }
  return getSettings(db)
}
