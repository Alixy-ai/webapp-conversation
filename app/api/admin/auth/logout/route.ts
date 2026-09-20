import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin/auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { ...sessionCookieOptions(false), maxAge: 0 })
  return res
}
