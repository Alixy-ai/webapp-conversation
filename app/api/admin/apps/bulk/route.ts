import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/auth'
import { deleteApps, setAppsEnabled } from '@/lib/apps/registry'

const ACTIONS = ['enable', 'disable', 'delete'] as const
type BulkAction = typeof ACTIONS[number]

const isBulkAction = (value: unknown): value is BulkAction =>
  typeof value === 'string' && (ACTIONS as readonly string[]).includes(value)

/**
 * Applies one action to many apps at once. Body: `{ ids: string[], action }`.
 */
export async function POST(request: NextRequest) {
  const denied = guardAdminApi(request)
  if (denied) { return denied }

  const body = await request.json().catch(() => null) as { ids?: unknown, action?: unknown } | null
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === 'string' && !!id) : []

  if (!ids.length) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (!isBulkAction(body?.action)) {
    return NextResponse.json({ error: `action must be one of ${ACTIONS.join(', ')}` }, { status: 400 })
  }

  const action = body.action
  const affected = action === 'delete' ? deleteApps(ids) : setAppsEnabled(ids, action === 'enable')

  return NextResponse.json({ ok: true, action, affected })
}
