import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { AppInput } from '@/lib/apps/types'
import { toPublicApp } from '@/lib/apps/types'
import { guardAdminApi } from '@/lib/admin/auth'
import { normalizeAiNotice } from '@/lib/apps/ai-notice'
import { deleteApp, getAppById, upsertApp } from '@/lib/apps/registry'

export async function GET(request: NextRequest, { params }: {
  params: Promise<{ id: string }>
}) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const { id } = await params
  const app = getAppById(id)
  if (!app) { return NextResponse.json({ error: 'not found' }, { status: 404 }) }
  return NextResponse.json(toPublicApp(app))
}

export async function PUT(request: NextRequest, { params }: {
  params: Promise<{ id: string }>
}) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const { id } = await params
  const existing = getAppById(id)
  if (!existing) { return NextResponse.json({ error: 'not found' }, { status: 404 }) }

  const body = await request.json().catch(() => ({})) as (Partial<AppInput> & Record<string, unknown>)
  // untyped JSON: a non-string slug would otherwise be bound straight into SQL
  const rawSlug: unknown = body.slug
  if (rawSlug !== undefined && (typeof rawSlug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(rawSlug))) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with dashes' }, { status: 400 })
  }
  const notice = normalizeAiNotice(body)
  if ('error' in notice) { return NextResponse.json({ error: notice.error }, { status: 400 }) }

  // blank means "keep what is stored", so a partial update never wipes the key
  const rawApiKey: unknown = body.apiKey
  const rawApiUrl: unknown = body.apiUrl
  try {
    const app = upsertApp({
      ...body,
      ...notice.value,
      id,
      slug: rawSlug ?? existing.slug,
      apiKey: (typeof rawApiKey === 'string' ? rawApiKey.trim() : '') || existing.apiKey,
      apiUrl: rawApiUrl === null
        ? ''
        : ((typeof rawApiUrl === 'string' ? rawApiUrl.trim() : '') || existing.apiUrl),
    })
    return NextResponse.json(toPublicApp(app))
  }
  catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed to save app' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: {
  params: Promise<{ id: string }>
}) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const { id } = await params
  if (!deleteApp(id)) { return NextResponse.json({ error: 'not found' }, { status: 404 }) }
  return NextResponse.json({ ok: true })
}
