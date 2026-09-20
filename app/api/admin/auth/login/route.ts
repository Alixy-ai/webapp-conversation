import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  adminUsername,
  clearAttempts,
  clientKey,
  createSessionToken,
  isAdminConfigured,
  registerFailedAttempt,
  retryAfter,
  sessionCookieOptions,
  verifyCredentials,
} from '@/lib/admin/auth'

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Admin login is not configured (set ADMIN_PASSWORD_HASH)' }, { status: 503 })
  }

  const key = clientKey(request)
  const wait = retryAfter(key)
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many attempts, try again in ${wait}s` },
      { status: 429, headers: { 'Retry-After': String(wait) } },
    )
  }

  const body = await request.json().catch(() => ({}))
  const username = String(body?.username ?? '')
  const password = String(body?.password ?? '')

  if (!verifyCredentials(username, password)) {
    registerFailedAttempt(key)
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  clearAttempts(key)
  const res = NextResponse.json({ ok: true, username: adminUsername() })
  res.cookies.set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(username),
    sessionCookieOptions(request.nextUrl.protocol === 'https:'),
  )
  return res
}
