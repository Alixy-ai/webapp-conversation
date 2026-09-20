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

// ── AI generated notice (seeded into the registry on first start) ─────────
import { DEFAULT_AI_NOTICE_POSITION, isAiNoticePosition } from '@/config'

const noticePosition = process.env.AI_NOTICE_POSITION
/** Default AI generated notice config, only used when seeding an empty registry. */
export const AI_NOTICE = {
  enabled: process.env.AI_NOTICE_ENABLED === 'true',
  text: process.env.AI_NOTICE_TEXT || '',
  position: (isAiNoticePosition(noticePosition) ? noticePosition : DEFAULT_AI_NOTICE_POSITION),
}
