import Database from 'better-sqlite3'

export type Db = Database.Database

/**
 * Ordered migrations. Index + 1 is the schema version recorded in
 * `PRAGMA user_version`; only migrations above the current version run.
 * Never edit a migration that has shipped — append a new one.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE wallets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    archived_at TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id   INTEGER NOT NULL REFERENCES wallets(id),
    direction   TEXT NOT NULL CHECK (direction IN ('in','out')),
    amount      INTEGER NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL DEFAULT '',
    occurred_on TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX idx_txn_date   ON transactions(occurred_on);
  CREATE INDEX idx_txn_wallet ON transactions(wallet_id, occurred_on);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `
]

function migrate(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.exec(MIGRATIONS[version])
    db.pragma(`user_version = ${version + 1}`)
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  currency: 'USD',
  week_start: 'monday'
}

function seed(db: Db): void {
  const now = new Date().toISOString()

  const insertSetting = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
  )
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value)

  const walletCount = db.prepare('SELECT COUNT(*) AS n FROM wallets').get() as { n: number }
  if (walletCount.n === 0) {
    db.prepare('INSERT INTO wallets (name, created_at) VALUES (?, ?)').run('Cash', now)
  }
}

/** Opens (or creates) the database at `file`, migrates it, and seeds defaults. */
export function openDatabase(file: string): Db {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seed(db)
  return db
}

/** In-memory database with the same schema — used by tests. */
export function openTestDatabase(): Db {
  return openDatabase(':memory:')
}
