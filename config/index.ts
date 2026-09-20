import type { AppInfo } from '@/types/app'
export const APP_ID = `${process.env.NEXT_PUBLIC_APP_ID}`
export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',
  disable_session_same_site: false, // set it to true if you want to embed the chatbot in an iframe
}

export const isShowPrompt = false
export const promptTemplate = 'I want you to act as a javascript console.'

/**
 * Sub-path the app is served from, '' when it sits at the domain root.
 * Set NEXT_PUBLIC_BASE_PATH=/chatbot to serve everything under /chatbot; the
 * value must start with '/' and is inlined at build time (see next.config.js),
 * so changing it needs a rebuild.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '')

export const API_PREFIX = `${BASE_PATH}/api`

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48

// ── Branding ────────────────────────────────────────────────────────────────
// Avatar shown in the header and used as the browser tab icon as well.
// Accepts an emoji ('🤖'), a file in /public ('/logo.png') or an absolute URL.
// Leave it empty to hide both the header avatar and the tab icon.
export const appIcon = ''
// Background of the avatar, any CSS color (e.g. '#EFF1F5'). Only used for emojis.
export const appIconBackground = ''
// Show the "Powered by Dify" link at the bottom of the welcome card.
export const isShowPoweredBy = false

// ── AI generated notice ─────────────────────────────────────────────────
/** Where the AI generated notice is rendered for an app. */
export const AI_NOTICE_POSITIONS = ['input_hint', 'answer_footer'] as const
export type AiNoticePosition = typeof AI_NOTICE_POSITIONS[number]
export const DEFAULT_AI_NOTICE_POSITION: AiNoticePosition = 'input_hint'
/** Max length in Unicode code points, shared by the admin form and the API. */
export const AI_NOTICE_TEXT_MAX_LEN = 200
export const isAiNoticePosition = (value: unknown): value is AiNoticePosition =>
  typeof value === 'string' && (AI_NOTICE_POSITIONS as readonly string[]).includes(value)
