import 'server-only'

import type { AppRecord } from './types'

export type CitationInput = Partial<Pick<AppRecord, 'citationEnabled' | 'citationApiKey' | 'citationApiUrl' | 'citationDatasetIds'>>

const ID_RE = /^[\w-]{1,64}$/

/**
 * Pick the citation settings out of an admin request body.
 * Missing key = keep stored value. `citationApiKey`: blank keeps, null clears.
 * `citationDatasetIds` accepts an array or a comma / newline separated string.
 */
export const normalizeCitation = (body: Record<string, unknown>): { value: CitationInput } | { error: string } => {
  const value: CitationInput = {}

  if (body.citationEnabled !== undefined) {
    if (typeof body.citationEnabled !== 'boolean') { return { error: 'citationEnabled must be a boolean' } }
    value.citationEnabled = body.citationEnabled
  }

  if (body.citationApiKey === null) { value.citationApiKey = '' }
  else if (body.citationApiKey !== undefined) {
    if (typeof body.citationApiKey !== 'string') { return { error: 'citationApiKey must be a string' } }
    const key = body.citationApiKey.trim()
    if (key) { value.citationApiKey = key }
  }

  if (body.citationApiUrl === null) { value.citationApiUrl = '' }
  else if (body.citationApiUrl !== undefined) {
    if (typeof body.citationApiUrl !== 'string') { return { error: 'citationApiUrl must be a string' } }
    const url = body.citationApiUrl.trim().replace(/\/+$/, '')
    if (url && !/^https?:\/\//.test(url)) { return { error: 'citationApiUrl must start with http(s)://' } }
    value.citationApiUrl = url
  }

  if (body.citationDatasetIds !== undefined) {
    const raw = body.citationDatasetIds
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\s,]+/) : null
    if (!list || list.some(id => typeof id !== 'string')) {
      return { error: 'citationDatasetIds must be a list of ids' }
    }
    const ids = Array.from(new Set((list as string[]).map(id => id.trim()).filter(Boolean)))
    if (ids.some(id => !ID_RE.test(id))) { return { error: 'citationDatasetIds contains an invalid id' } }
    value.citationDatasetIds = ids
  }

  return { value }
}

/** Raw body without citation fields, so only normalised values reach upsertApp. */
export const omitCitationFields = <T extends Record<string, unknown>>(body: T) => {
  const { citationEnabled, citationApiKey, citationApiUrl, citationDatasetIds, citationKeySet, ...rest } = body
  void citationEnabled; void citationApiKey; void citationApiUrl; void citationDatasetIds; void citationKeySet
  return rest
}
