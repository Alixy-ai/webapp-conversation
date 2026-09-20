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
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS apps_enabled_idx ON apps (enabled, created_at);
`

let database: DatabaseSync | null = null

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

  database = db
  return database
}
