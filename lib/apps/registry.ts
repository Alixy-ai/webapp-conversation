import 'server-only'

import { APP_INFO, DEFAULT_AI_NOTICE_POSITION, appIcon, appIconBackground, isAiNoticePosition, isShowPoweredBy } from '@/config'
import { AI_NOTICE } from '@/config/server'
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
  aiNoticeEnabled: !!row.ai_notice_enabled,
  aiNoticeText: row.ai_notice_text ?? '',
  aiNoticePosition: isAiNoticePosition(row.ai_notice_position) ? row.ai_notice_position : DEFAULT_AI_NOTICE_POSITION,
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
    aiNoticeEnabled: input.aiNoticeEnabled ?? existing?.aiNoticeEnabled ?? false,
    aiNoticeText: input.aiNoticeText ?? existing?.aiNoticeText ?? '',
    aiNoticePosition: input.aiNoticePosition ?? existing?.aiNoticePosition ?? DEFAULT_AI_NOTICE_POSITION,
    enabled: input.enabled ?? existing?.enabled ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  getDb().prepare(`
    INSERT INTO apps (
      id, slug, name, description, copyright, privacy_policy, default_language,
      disable_session_same_site, api_key, api_url, icon, icon_background,
      show_powered_by, ai_notice_enabled, ai_notice_text, ai_notice_position,
      enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      ai_notice_enabled = excluded.ai_notice_enabled,
      ai_notice_text = excluded.ai_notice_text,
      ai_notice_position = excluded.ai_notice_position,
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
    merged.aiNoticeEnabled ? 1 : 0,
    merged.aiNoticeText,
    merged.aiNoticePosition,
    merged.enabled ? 1 : 0,
    merged.createdAt,
    merged.updatedAt,
  )

  return getAppById(input.id)!
}

export const deleteApp = (id: string): boolean => {
  return getDb().prepare('DELETE FROM apps WHERE id = ?').run(id).changes > 0
}

// ── list / search / pagination ───────────────────────────────────────────────
export interface AppsQuery {
  /** include apps that are switched off (admin views) */
  includeDisabled?: boolean
  /** matches name, slug or Dify app id */
  search?: string
  page?: number
  pageSize?: number
}

export interface AppsPage {
  apps: AppRecord[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

const MAX_PAGE_SIZE = 100

const whereClause = ({ includeDisabled, search }: AppsQuery) => {
  const conditions: string[] = []
  const params: string[] = []

  if (!includeDisabled) { conditions.push('enabled = 1') }

  const term = (search || '').trim()
  if (term) {
    conditions.push('(name LIKE ? OR slug LIKE ? OR id LIKE ?)')
    const like = `%${term}%`
    params.push(like, like, like)
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  }
}

/** Total number of apps, split by enabled state. */
export const countApps = () => {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS total, COALESCE(SUM(enabled), 0) AS active FROM apps')
    .get() as { total: number, active: number }
  return { total: row.total, active: row.active }
}

/** One page of apps, with the total so callers can render pager metadata. */
export const queryApps = (query: AppsQuery = {}): AppsPage => {
  const db = getDb()
  const { sql: where, params } = whereClause(query)

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM apps ${where}`)
    .get(...params) as { total: number }

  const pageSize = Math.min(Math.max(Math.trunc(query.pageSize || 10), 1), MAX_PAGE_SIZE)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(Math.trunc(query.page || 1), 1), pageCount)

  const rows = db
    .prepare(`SELECT * FROM apps ${where} ORDER BY name COLLATE NOCASE ASC, created_at ASC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as Record<string, any>[]

  return { apps: rows.map(fromRow), total, page, pageSize, pageCount }
}

// ── bulk operations ──────────────────────────────────────────────────────────
const placeholders = (ids: string[]) => ids.map(() => '?').join(',')

/** Returns how many rows changed. */
export const setAppsEnabled = (ids: string[], enabled: boolean): number => {
  if (!ids.length) { return 0 }
  return getDb()
    .prepare(`UPDATE apps SET enabled = ?, updated_at = ? WHERE id IN (${placeholders(ids)})`)
    .run(enabled ? 1 : 0, Date.now(), ...ids)
    .changes
}

/** Returns how many rows were removed. */
export const deleteApps = (ids: string[]): number => {
  if (!ids.length) { return 0 }
  return getDb()
    .prepare(`DELETE FROM apps WHERE id IN (${placeholders(ids)})`)
    .run(...ids)
    .changes
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
    aiNoticeEnabled: AI_NOTICE.enabled,
    aiNoticeText: AI_NOTICE.text,
    aiNoticePosition: AI_NOTICE.position,
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
