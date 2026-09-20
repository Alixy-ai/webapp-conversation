import 'server-only'

import { APP_INFO, appIcon, appIconBackground, isShowPoweredBy } from '@/config'
import { getDb } from './db'
import type { AppInput, AppRecord } from './types'

const fromRow = (row: Record<string, any>): AppRecord => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? '',
  copyright: row.copyright ?? '',
  privacyPolicy: row.privacy_policy ?? '',
  defaultLanguage: row.default_language ?? 'en',
  disableSessionSameSite: !!row.disable_session_same_site,
  apiKey: row.api_key,
  apiUrl: row.api_url,
  icon: row.icon ?? '',
  iconBackground: row.icon_background ?? '',
  showPoweredBy: !!row.show_powered_by,
  enabled: !!row.enabled,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const listApps = (includeDisabled = false): AppRecord[] => {
  const sql = includeDisabled
    ? 'SELECT * FROM apps ORDER BY created_at ASC'
    : 'SELECT * FROM apps WHERE enabled = 1 ORDER BY created_at ASC'
  return (getDb().prepare(sql).all() as Record<string, any>[]).map(fromRow)
}

export const getAppBySlug = (slug: string): AppRecord | null => {
  const row = getDb().prepare('SELECT * FROM apps WHERE slug = ?').get(slug) as Record<string, any> | undefined
  return row ? fromRow(row) : null
}

export const getAppById = (id: string): AppRecord | null => {
  const row = getDb().prepare('SELECT * FROM apps WHERE id = ?').get(id) as Record<string, any> | undefined
  return row ? fromRow(row) : null
}

export const upsertApp = (input: AppInput): AppRecord => {
  const existing = getAppById(input.id)
  const now = Date.now()
  const merged: AppRecord = {
    id: input.id,
    slug: input.slug,
    name: input.name ?? existing?.name ?? input.slug,
    description: input.description ?? existing?.description ?? '',
    copyright: input.copyright ?? existing?.copyright ?? '',
    privacyPolicy: input.privacyPolicy ?? existing?.privacyPolicy ?? '',
    defaultLanguage: input.defaultLanguage ?? existing?.defaultLanguage ?? 'en',
    disableSessionSameSite: input.disableSessionSameSite ?? existing?.disableSessionSameSite ?? false,
    apiKey: input.apiKey,
    apiUrl: input.apiUrl,
    icon: input.icon ?? existing?.icon ?? '',
    iconBackground: input.iconBackground ?? existing?.iconBackground ?? '',
    showPoweredBy: input.showPoweredBy ?? existing?.showPoweredBy ?? false,
    enabled: input.enabled ?? existing?.enabled ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  getDb().prepare(`
    INSERT INTO apps (
      id, slug, name, description, copyright, privacy_policy, default_language,
      disable_session_same_site, api_key, api_url, icon, icon_background,
      show_powered_by, enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      description = excluded.description,
      copyright = excluded.copyright,
      privacy_policy = excluded.privacy_policy,
      default_language = excluded.default_language,
      disable_session_same_site = excluded.disable_session_same_site,
      api_key = excluded.api_key,
      api_url = excluded.api_url,
      icon = excluded.icon,
      icon_background = excluded.icon_background,
      show_powered_by = excluded.show_powered_by,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(
    merged.id,
    merged.slug,
    merged.name,
    merged.description,
    merged.copyright,
    merged.privacyPolicy,
    merged.defaultLanguage,
    merged.disableSessionSameSite ? 1 : 0,
    merged.apiKey,
    merged.apiUrl,
    merged.icon,
    merged.iconBackground,
    merged.showPoweredBy ? 1 : 0,
    merged.enabled ? 1 : 0,
    merged.createdAt,
    merged.updatedAt,
  )

  return getAppById(input.id)!
}

export const deleteApp = (id: string): boolean => {
  return getDb().prepare('DELETE FROM apps WHERE id = ?').run(id).changes > 0
}

/**
 * Bootstraps the registry from the environment on first use, so an existing
 * single-app deployment keeps working without touching the database.
 */
const seedFromEnv = () => {
  const { count } = getDb().prepare('SELECT COUNT(*) AS count FROM apps').get() as { count: number }
  if (count > 0) { return }

  const id = process.env.NEXT_PUBLIC_APP_ID
  const apiKey = process.env.APP_KEY || process.env.NEXT_PUBLIC_APP_KEY || ''
  if (!id || !apiKey) { return }

  upsertApp({
    id,
    slug: process.env.APP_SLUG || 'default',
    name: process.env.APP_NAME || APP_INFO.title,
    description: APP_INFO.description,
    copyright: APP_INFO.copyright || '',
    privacyPolicy: APP_INFO.privacy_policy || '',
    defaultLanguage: APP_INFO.default_language,
    disableSessionSameSite: !!APP_INFO.disable_session_same_site,
    apiKey,
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '',
    icon: appIcon,
    iconBackground: appIconBackground,
    showPoweredBy: isShowPoweredBy,
    enabled: true,
  })
}

let seeded: Promise<void> | null = null
export const ensureAppsSeeded = () => {
  if (!seeded) { seeded = Promise.resolve().then(seedFromEnv) }
  return seeded
}

/** Enabled app for a URL segment, or null when it does not exist / is disabled. */
export const resolveApp = async (slug: string): Promise<AppRecord | null> => {
  await ensureAppsSeeded()
  const app = getAppBySlug(slug)
  return app?.enabled ? app : null
}

export const resolveApps = async (): Promise<AppRecord[]> => {
  await ensureAppsSeeded()
  return listApps()
}
