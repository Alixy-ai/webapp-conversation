/**
 * Citation markers emitted by the workflow: `[S:<segment_id>]`, where the id
 * is a full segment UUID or its first 8 hex chars. Shared by server + client.
 */
export const MARKER_RE = /\[S:([0-9a-fA-F][0-9a-fA-F-]{7,35})\]/g
/** a marker still being streamed at the end of the text */
const PARTIAL_TAIL_RE = /\s?\[(?:S(?::[0-9a-fA-F-]{0,36})?)?$/
export const REF_RE = /^[0-9a-fA-F][0-9a-fA-F-]{7,35}$/
export const MAX_REFS = 50

/** Unique refs in order of first appearance. */
export const extractRefs = (text: string): string[] => {
  const seen = new Set<string>()
  for (const match of (text || '').matchAll(MARKER_RE)) { seen.add(match[1].toLowerCase()) }
  return Array.from(seen)
}

/** a run of adjacent markers, e.g. ` [S:a] [S:b]` */
const GROUP_RE = /\s?(?:\[S:[0-9a-fA-F][0-9a-fA-F-]{7,35}\]\s?)+/g

/**
 * Inline badges are rendered as markdown links to this sentinel URL so they
 * survive streamdown's link hardening; the custom `a` renderer turns them
 * into citation badges. `.invalid` never resolves.
 */
export const CITE_HREF_PREFIX = 'https://cite.invalid/'
export const citeNumberFromHref = (href?: string | null): number | null => {
  if (!href || !href.startsWith(CITE_HREF_PREFIX)) { return null }
  const n = Number(href.slice(CITE_HREF_PREFIX.length))
  return Number.isInteger(n) && n > 0 ? n : null
}

/** a heading-like line such as `参考来源：` / `**Sources:**` */
const SOURCE_LABEL_RE = /^\s*(?:[-*>#]+\s*)?\**\s*(?:参考来源|引用来源|参考资料|参考文献|参考|引用|来源|sources?|references?|citations?)\s*\**\s*[:：]?\s*\**\s*$/i

/**
 * Detects markers the model piled up at the end of the answer instead of
 * placing them beside the claims they support. Returns the prose without the
 * pile (and without a trailing `参考来源：` label), or null when the markers
 * are placed inline.
 */
export const stripTrailingDump = (text: string): string | null => {
  const groups = Array.from((text || '').matchAll(GROUP_RE))
  if (!groups.length || extractRefs(text).length < 2) { return null }
  const first = groups[0].index ?? 0
  // after the first marker only markers / punctuation / whitespace may follow
  if (!/^[\s\p{P}]*$/u.test(text.slice(first).replace(GROUP_RE, ' '))) { return null }

  const lines = text.slice(0, first).replace(/\s+$/, '').split('\n')
  if (lines.length > 1 && SOURCE_LABEL_RE.test(lines[lines.length - 1])) { lines.pop() }
  const prose = lines.join('\n').replace(/\s+$/, '')
  // a one-sentence answer ending with its citations is placed correctly
  const sentences = prose.split(/[。！？!?\n]|\.\s/).filter(s => s.trim()).length
  return sentences > 1 ? prose : null
}

/**
 * Display text: resolved markers become inline badge links (`[1](…)`),
 * unknown ones are dropped, consecutive duplicates collapse. Markers dumped
 * at the end are removed entirely (the footer still lists the sources).
 * While streaming, a half written marker at the tail is hidden.
 */
export const renderMarkers = (text: string, numbers: Record<string, number> = {}, streaming = false): string => {
  let out = text || ''
  if (!streaming) {
    const prose = stripTrailingDump(out)
    if (prose !== null) { return prose }
  }
  out = out.replace(GROUP_RE, (group) => {
    const nums: number[] = []
    for (const match of group.matchAll(MARKER_RE)) {
      const n = numbers[match[1].toLowerCase()]
      if (n && !nums.includes(n)) { nums.push(n) }
    }
    const trailing = /\s$/.test(group) ? ' ' : ''
    return nums.length ? `${nums.map(n => `[${n}](${CITE_HREF_PREFIX}${n})`).join('')}${trailing}` : trailing
  })
  if (streaming) { out = out.replace(PARTIAL_TAIL_RE, '') }
  return out
}
