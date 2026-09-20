import 'server-only'

/**
 * Server-side credentials for the Dify app.
 *
 * These must never be imported from a client component: `NEXT_PUBLIC_*` values
 * are inlined into the browser bundle at build time, so keeping the key in a
 * `server-only` module is what stops it from leaking to visitors.
 *
 * `NEXT_PUBLIC_APP_KEY` / `NEXT_PUBLIC_API_URL` are still honoured so that
 * existing deployments keep working, but the unprefixed names are preferred.
 */
export const API_KEY = process.env.APP_KEY || process.env.NEXT_PUBLIC_APP_KEY || ''
export const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || ''
