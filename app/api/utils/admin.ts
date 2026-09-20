import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

/**
 * The admin API can read and rewrite every app's credentials, so it stays
 * disabled until ADMIN_TOKEN is set.
 */
export const adminToken = () => process.env.ADMIN_TOKEN || ''

export const isAdmin = (request: NextRequest) => {
  const expected = adminToken()
  if (!expected) { return false }

  const header = request.headers.get('x-admin-token')
    || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')

  if (!header || header.length !== expected.length) { return false }
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

export const adminDisabled = () => new Response('Admin API disabled: set ADMIN_TOKEN', { status: 503 })
export const unauthorized = () => new Response('Unauthorized', { status: 401 })
