import 'server-only'

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  copyright TEXT NOT NULL DEFAULT '',
  privacy_policy TEXT NOT NULL DEFAULT '',
  default_language TEXT NOT NULL DEFAULT 'en',
  disable_session_same_site INTEGER NOT NULL DEFAULT 0,
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  icon_background TEXT NOT NULL DEFAULT '',
  show_powered_by INTEGER NOT NULL DEFAULT 0,
  ai_notice_enabled INTEGER NOT NULL DEFAULT 0,
  ai_notice_text TEXT NOT NULL DEFAULT '',
  ai_notice_position TEXT NOT NULL DEFAULT 'input_hint',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS apps_enabled_idx ON apps (enabled, created_at);
`

let database: DatabaseSync | null = null

const AI_NOTICE_COLUMNS: Array<[string, string]> = [
  ['ai_notice_enabled', 'INTEGER NOT NULL DEFAULT 0'],
  ['ai_notice_text', 'TEXT NOT NULL DEFAULT \'\''],
  ['ai_notice_position', 'TEXT NOT NULL DEFAULT \'input_hint\''],
]

/**
 * `CREATE TABLE IF NOT EXISTS` never adds columns to an existing database,
 * so add the AI notice columns on demand. Safe to run repeatedly.
 */
const migrate = (db: DatabaseSync) => {
  const existing = new Set(
    (db.prepare('SELECT name FROM pragma_table_info(\'apps\')').all() as { name: string }[])
      .map(column => column.name),
  )
  for (const [name, definition] of AI_NOTICE_COLUMNS) {
    if (!existing.has(name)) { db.exec(`ALTER TABLE apps ADD COLUMN ${name} ${definition}`) }
  }
}

/**
 * Single connection per server process. The file lives outside the repo
 * (`data/apps.db` by default) and can be pointed anywhere with REGISTRY_DB_PATH,
 * e.g. at a mounted volume in Docker.
 */
export const getDb = () => {
  if (database) { return database }

  const file = process.env.REGISTRY_DB_PATH || join(process.cwd(), 'data', 'apps.db')
  mkdirSync(dirname(file), { recursive: true })

  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  migrate(db)

  database = db
  return database
}
