import 'server-only'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { BASE_PATH } from '@/config'

export const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export const adminUsername = () => process.env.ADMIN_USERNAME || 'admin'
const storedHash = () => process.env.ADMIN_PASSWORD_HASH || ''
const storedPassword = () => process.env.ADMIN_PASSWORD || ''

/** Login is possible as soon as either a hash or a plain password is set. */
export const isAdminConfigured = () => !!(storedHash() || storedPassword())

/**
 * `scrypt:<salt>:<hash>` — see scripts/hash-admin-password.mjs.
 *
 * Deliberately avoids `$`: values in .env files go through dotenv expansion,
 * which would swallow `$salt` / `$hash` and silently break the credential.
 */
export const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

const equals = (a: string, b: string) => {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}

const verifyPassword = (password: string) => {
  const hash = storedHash()
  if (hash) {
    const [scheme, salt, expected] = hash.split(':')
    if (scheme !== 'scrypt' || !salt || !expected) { return false }
    const actual = scryptSync(password, salt, Buffer.from(expected, 'hex').length).toString('hex')
    return equals(actual, expected)
  }

  const plain = storedPassword()
  return !!plain && equals(password, plain)
}

export const verifyCredentials = (username: string, password: string) => {
  if (!isAdminConfigured()) { return false }
  // compare both so a wrong username costs the same as a wrong password
  const userOk = equals(username, adminUsername())
  const passwordOk = verifyPassword(password)
  return userOk && passwordOk
}

// ── session cookie ───────────────────────────────────────────────────────────
const sessionSecret = () => process.env.ADMIN_SESSION_SECRET
  || `${adminUsername()}:${storedHash() || storedPassword()}:${process.env.REGISTRY_DB_PATH || 'registry'}`

const sign = (payload: string) => createHmac('sha256', sessionSecret()).update(payload).digest('base64url')

export const createSessionToken = (username: string) => {
  const payload = Buffer.from(JSON.stringify({
    u: username,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export const verifySessionToken = (token?: string | null) => {
  if (!token) { return null }

  const [payload, signature] = token.split('.')
  if (!payload || !signature || !equals(signature, sign(payload))) { return null }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data?.u || typeof data.exp !== 'number' || data.exp < Date.now()) { return null }
    return data as { u: string, exp: number }
  }
  catch {
    return null
  }
}

export const sessionCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure,
  // scoped to the app when it is served from a sub-path, '/' otherwise
  path: BASE_PATH || '/',
  maxAge: SESSION_TTL_SECONDS,
})

// ── api guard ────────────────────────────────────────────────────────────────
/** The admin API is reachable when a token or login credentials are configured. */
export const adminApiEnabled = () => !!(process.env.ADMIN_TOKEN || isAdminConfigured())

/**
 * Accepts either the login session cookie (browser) or the static ADMIN_TOKEN
 * header (scripts/CI).
 */
export const isAdminRequest = (request: NextRequest) => {
  if (verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) { return true }

  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) { return false }

  const provided = request.headers.get('x-admin-token')
    || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return !!provided && equals(provided, expected)
}

export const adminDisabled = () => new Response('Admin is disabled: set ADMIN_TOKEN or ADMIN_PASSWORD_HASH', { status: 503 })
export const unauthorized = () => new Response('Unauthorized', { status: 401 })

/** Returns a response when the request must be rejected, otherwise null. */
export const guardAdminApi = (request: NextRequest) => {
  if (!adminApiEnabled()) { return adminDisabled() }
  if (!isAdminRequest(request)) { return unauthorized() }
  return null
}

// ── login throttling (per process) ───────────────────────────────────────────
const attempts = new Map<string, { count: number, resetAt: number }>()

export const clientKey = (request: NextRequest) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || request.headers.get('x-real-ip')
  || 'local'

/** Seconds to wait before the next attempt, 0 when attempts are still allowed. */
export const retryAfter = (key: string) => {
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < Date.now()) {
    attempts.delete(key)
    return 0
  }
  if (entry.count < MAX_ATTEMPTS) { return 0 }
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000))
}

export const registerFailedAttempt = (key: string) => {
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS })
    return
  }
  entry.count += 1
}

export const clearAttempts = (key: string) => {
  attempts.delete(key)
}
