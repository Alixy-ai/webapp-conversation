import type { ReasoningStep } from '@/types/app'

/**
 * Model reasoning arrives in agent_log "Thought" entries as `data.output`,
 * usually wrapped in `<think>…</think>` (plus a provider marker comment).
 * This pulls out the human-readable reasoning text, stripping the tags,
 * the `<!--…-->` provider markers, and any citation markers.
 */
const THINK_BLOCK = /<think>([\s\S]*?)(?:<\/think>|$)/gi
const PROVIDER_MARKER = /<!--[\s\S]*?-->/g
const CITATION_MARKER = /\s?\[S:[0-9a-fA-F][0-9a-fA-F-]{7,35}\]/g

export const extractReasoning = (raw: unknown): string => {
  if (typeof raw !== 'string' || !raw) { return '' }
  const blocks: string[] = []
  let match: RegExpExecArray | null
  THINK_BLOCK.lastIndex = 0
  // eslint-disable-next-line no-cond-assign
  while ((match = THINK_BLOCK.exec(raw))) { blocks.push(match[1]) }
  const text = (blocks.length ? blocks.join('\n\n') : raw)
    .replace(PROVIDER_MARKER, '')
    .replace(CITATION_MARKER, '')
    .trim()
  return text
}

/** True when a Thought-style agent log carries reasoning worth showing. */
export const isReasoningLabel = (label: string | undefined): boolean =>
  !!label && /thought|reasoning|think/i.test(label)

/**
 * Merge a reasoning step into the list, replacing any earlier entry with the
 * same id (an agent log is sent "start" then "success" with the full text).
 */
export const upsertReasoning = (list: ReasoningStep[], step: ReasoningStep): ReasoningStep[] => {
  if (!step.text) { return list }
  const index = list.findIndex(item => item.id === step.id)
  if (index >= 0) {
    const next = list.slice()
    next[index] = step
    return next
  }
  return [...list, step]
}
