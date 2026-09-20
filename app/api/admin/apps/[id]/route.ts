import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { AppInput } from '@/lib/apps/types'
import { toPublicApp } from '@/lib/apps/types'
import { guardAdminApi } from '@/lib/admin/auth'
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

  const body = await request.json().catch(() => ({})) as Partial<AppInput>
  if (body.slug && !/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with dashes' }, { status: 400 })
  }

  try {
    const app = upsertApp({
      ...body,
      id,
      slug: body.slug ?? existing.slug,
      apiKey: body.apiKey ?? existing.apiKey,
      apiUrl: body.apiUrl ?? existing.apiUrl,
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
