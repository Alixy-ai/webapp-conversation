import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { AppInput } from '@/lib/apps/types'
import { toPublicApp } from '@/lib/apps/types'
import { guardAdminApi } from '@/lib/admin/auth'
import { ensureAppsSeeded, listApps, upsertApp } from '@/lib/apps/registry'

export async function GET(request: NextRequest) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  await ensureAppsSeeded()
  return NextResponse.json(listApps(true).map(toPublicApp))
}

export async function POST(request: NextRequest) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const body = await request.json().catch(() => null) as Partial<AppInput> | null
  if (!body?.id || !body?.slug || !body?.apiKey) {
    return NextResponse.json({ error: 'id, slug and apiKey are required' }, { status: 400 })
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with dashes' }, { status: 400 })
  }

  try {
    const app = upsertApp({ apiUrl: '', ...body, id: body.id, slug: body.slug, apiKey: body.apiKey })
    return NextResponse.json(toPublicApp(app), { status: 201 })
  }
  catch (e: any) {
    // UNIQUE constraint on slug
    return NextResponse.json({ error: e?.message || 'failed to save app' }, { status: 400 })
  }
}
