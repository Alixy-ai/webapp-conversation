import 'server-only'

import { AI_NOTICE_POSITIONS, AI_NOTICE_TEXT_MAX_LEN, isAiNoticePosition } from '@/config'
import type { AiNoticePosition } from '@/config'

export interface AiNoticeInput {
  aiNoticeEnabled?: boolean
  aiNoticeText?: string
  aiNoticePosition?: AiNoticePosition
}

/**
 * Pick out the AI notice related fields from a request body.
 * A missing key means "keep the stored value"; an invalid value is an error.
 */
export const normalizeAiNotice = (body: Record<string, unknown>): { value: AiNoticeInput } | { error: string } => {
  const value: AiNoticeInput = {}

  if (body.aiNoticeEnabled !== undefined) {
    if (typeof body.aiNoticeEnabled !== 'boolean') { return { error: 'aiNoticeEnabled must be a boolean' } }
    value.aiNoticeEnabled = body.aiNoticeEnabled
  }

  if (body.aiNoticeText !== undefined) {
    if (typeof body.aiNoticeText !== 'string') { return { error: 'aiNoticeText must be a string' } }
    const text = body.aiNoticeText.trim()
    if (Array.from(text).length > AI_NOTICE_TEXT_MAX_LEN) {
      return { error: `aiNoticeText must be at most ${AI_NOTICE_TEXT_MAX_LEN} characters` }
    }
    value.aiNoticeText = text
  }

  if (body.aiNoticePosition !== undefined) {
    if (!isAiNoticePosition(body.aiNoticePosition)) {
      return { error: `aiNoticePosition must be one of ${AI_NOTICE_POSITIONS.join(', ')}` }
    }
    value.aiNoticePosition = body.aiNoticePosition
  }

  return { value }
}
