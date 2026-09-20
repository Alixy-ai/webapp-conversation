import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { AppInput } from '@/lib/apps/types'
import { toPublicApp } from '@/lib/apps/types'
import { guardAdminApi } from '@/lib/admin/auth'
import { normalizeAiNotice } from '@/lib/apps/ai-notice'
import { ensureAppsSeeded, getAppById, listApps, upsertApp } from '@/lib/apps/registry'

export async function GET(request: NextRequest) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  await ensureAppsSeeded()
  return NextResponse.json(listApps(true).map(toPublicApp))
}

export async function POST(request: NextRequest) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const body = await request.json().catch(() => null) as (Partial<AppInput> & Record<string, unknown>) | null
  // everything below arrives as untyped JSON: nothing may be assumed to be a string
  const rawId: unknown = body?.id
  const rawSlug: unknown = body?.slug
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  const slug = typeof rawSlug === 'string' ? rawSlug.trim() : ''
  if (!body || !id || !slug) {
    return NextResponse.json({ error: 'id and slug are required' }, { status: 400 })
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with dashes' }, { status: 400 })
  }

  /**
   * This endpoint both creates and replaces. The API key never reaches the
   * browser, so an edit arrives without it: blank means "keep what is stored"
   * and the credentials are only mandatory when the app does not exist yet.
   * Pass `apiUrl: null` to clear it and fall back to the Dify default.
   */
  const existing = getAppById(id)
  const rawApiKey: unknown = body.apiKey
  const rawApiUrl: unknown = body.apiUrl
  const apiKey = (typeof rawApiKey === 'string' ? rawApiKey.trim() : '') || existing?.apiKey || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey is required when creating an app' }, { status: 400 })
  }
  const apiUrl = rawApiUrl === null
    ? ''
    : ((typeof rawApiUrl === 'string' ? rawApiUrl.trim() : '') || existing?.apiUrl || '')

  const notice = normalizeAiNotice(body)
  if ('error' in notice) { return NextResponse.json({ error: notice.error }, { status: 400 }) }

  try {
    const app = upsertApp({ ...body, ...notice.value, id, slug, apiKey, apiUrl })
    return NextResponse.json(toPublicApp(app), { status: 201 })
  }
  catch (e: any) {
    // UNIQUE constraint on slug
    return NextResponse.json({ error: e?.message || 'failed to save app' }, { status: 400 })
  }
}
