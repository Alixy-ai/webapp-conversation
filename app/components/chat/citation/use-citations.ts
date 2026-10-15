'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CitationItem } from '../type'
import { API_PREFIX } from '@/config'
import { MAX_REFS, extractRefs } from '@/utils/citation'

/** ref → segment, null = looked up and unknown. Shared across answers. */
/** keyed by `${slug}:${ref}` would be cleaner, but refs are UUID-scoped already */
const cache = new Map<string, CitationItem | null>()
const inflight = new Map<string, Promise<void>>()

const load = (slug: string, refs: string[]) => {
  const todo = refs.filter(ref => !cache.has(ref) && !inflight.has(ref))
  if (!todo.length) { return Promise.all(refs.map(ref => inflight.get(ref))).then(() => {}) }

  const job = fetch(`${API_PREFIX}/apps/${slug}/citations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refs: todo }),
  })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((res) => {
      const found = res?.citations || {}
      for (const ref of todo) { cache.set(ref, found[ref] || null) }
    })
    .catch(() => { /* lookup failed: leave uncached so a later render can retry */ })
    .finally(() => { for (const ref of todo) { inflight.delete(ref) } })
  for (const ref of todo) { inflight.set(ref, job) }
  return Promise.all(refs.map(ref => inflight.get(ref))).then(() => {})
}

export interface ResolvedCitations {
  /** cited segments in order of first mention */
  items: CitationItem[]
  /** ref → display number (1-based) */
  numbers: Record<string, number>
}

/**
 * Resolves `[S:<id>]` markers of a settled answer. While `enabled` is false
 * (still streaming / feature off) nothing is requested.
 */
export const useCitations = (slug: string, content: string, enabled: boolean): ResolvedCitations => {
  const refs = useMemo(() => (enabled ? extractRefs(content).slice(0, MAX_REFS) : []), [content, enabled])
  const key = refs.join(',')
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!refs.length) { return }
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    // A failed lookup leaves its refs uncached and the effect above never runs
    // again, so a transient Knowledge API error (the route answers 502) would
    // hide the citations for that answer until a full page reload. Retry twice.
    const run = (attempt: number) => {
      load(slug, refs).then(() => {
        if (!alive) { return }
        setTick(t => t + 1)
        if (attempt < 2 && refs.some(ref => !cache.has(ref))) {
          timer = setTimeout(() => { if (alive) { run(attempt + 1) } }, 1200 * (attempt + 1))
        }
      })
    }
    run(0)
    return () => { alive = false; if (timer) { clearTimeout(timer) } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const items: CitationItem[] = []
  const numbers: Record<string, number> = {}
  const bySegment = new Map<string, number>()
  for (const ref of refs) {
    const seg = cache.get(ref)
    if (!seg) { continue }
    // a full id and its short form may both appear: same number
    const existing = bySegment.get(seg.segment_id)
    if (existing) { numbers[ref] = existing; continue }
    items.push(seg)
    numbers[ref] = items.length
    bySegment.set(seg.segment_id, items.length)
  }
  return { items, numbers }
}
