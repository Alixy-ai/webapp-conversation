import 'server-only'

import type { AppRecord } from '@/lib/apps/types'

/**
 * Resolves citation markers to knowledge segments via the Dify Knowledge API.
 *
 * Marker `[S:<doc8>-<seg8>]` (document id prefix + segment id prefix):
 *   1. document prefix → document, from the documents list of the configured
 *      datasets (one paged call per dataset, cached);
 *   2. segment prefix → segment, from that one document's segments list
 *      (cached per document).
 * Only the cited documents are read; nothing is pre-indexed.
 *
 * Legacy markers without a document part (`[S:<seg8>]` / full segment id)
 * cannot be located by the API, so they fall back to scanning the configured
 * datasets once (only triggered when such a marker shows up, e.g. old history).
 */

export interface CitationSegment {
  dataset_id: string
  dataset_name: string
  document_id: string
  document_name: string
  data_source_type: string
  segment_id: string
  segment_position: number
  content: string
  word_count: number
  hit_count: number
  index_node_hash: string
}

interface DocInfo { dataset_id: string, dataset_name: string, id: string, name: string, data_source_type: string }
interface Cached<T> { value: T, at: number }

const TTL_MS = Number(process.env.CITATION_CACHE_TTL_MS) || 10 * 60 * 1000
/** a miss may mean new content: allow one refresh per this window */
const MISS_REFRESH_MS = 60 * 1000
const PAGE_LIMIT = 100
const MAX_PAGES = 200
const CONCURRENCY = 6
const PREFIX = 8

const NEW_REF = /^([0-9a-f]{8})-([0-9a-f]{8})$/
const FULL_UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/

// per app revision (`${id}:${updatedAt}`), so editing the config drops caches
const docLists = new Map<string, Cached<DocInfo[]>>()
const segLists = new Map<string, Cached<CitationSegment[]>>()
const inflight = new Map<string, Promise<any>>()

const revision = (app: AppRecord) => `${app.id}:${app.updatedAt}`
const baseUrl = (app: AppRecord) => (app.citationApiUrl || app.apiUrl || 'https://api.dify.ai/v1').replace(/\/+$/, '')

const createApi = (app: AppRecord) => async (path: string): Promise<any> => {
  const res = await fetch(`${baseUrl(app)}${path}`, {
    headers: { Authorization: `Bearer ${app.citationApiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) { throw new Error(`Knowledge API ${res.status} on ${path.split('?')[0]}`) }
  return res.json()
}
type Api = ReturnType<typeof createApi>

const paged = async (api: Api, path: string): Promise<any[]> => {
  const out: any[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const json = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=${PAGE_LIMIT}`)
    const data: any[] = json?.data || []
    out.push(...data)
    if (!json?.has_more || !data.length) { break }
  }
  return out
}

const pool = async <T>(items: T[], worker: (item: T) => Promise<void>) => {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) { await worker(items[next++]) }
  }))
}

/** Cached loader with request coalescing; `force` refreshes entries older than MISS_REFRESH_MS. */
const cached = async <T>(store: Map<string, Cached<T>>, key: string, load: () => Promise<T>, force = false): Promise<T> => {
  const hit = store.get(key)
  const age = hit ? Date.now() - hit.at : Infinity
  if (hit && age < TTL_MS && !(force && age > MISS_REFRESH_MS)) { return hit.value }
  const flightKey = `${store === docLists ? 'd' : 's'}:${key}`
  let pending = inflight.get(flightKey) as Promise<T> | undefined
  if (!pending) {
    pending = load()
      .then((value) => { store.set(key, { value, at: Date.now() }); return value })
      .finally(() => inflight.delete(flightKey))
    inflight.set(flightKey, pending)
  }
  return pending
}

const datasetsOf = async (app: AppRecord, api: Api): Promise<{ id: string, name: string }[]> => {
  if (app.citationDatasetIds.length) {
    return Promise.all(app.citationDatasetIds.map(async (id) => {
      const json = await api(`/datasets/${encodeURIComponent(id)}`).catch(() => null)
      return { id, name: json?.name || '' }
    }))
  }
  return (await paged(api, '/datasets')).map(d => ({ id: d.id, name: d.name || '' }))
}

const getDocs = (app: AppRecord, api: Api, force = false) => cached(docLists, revision(app), async () => {
  const docs: DocInfo[] = []
  for (const ds of await datasetsOf(app, api)) {
    for (const doc of await paged(api, `/datasets/${encodeURIComponent(ds.id)}/documents`)) {
      docs.push({ dataset_id: ds.id, dataset_name: ds.name, id: doc.id, name: doc.name || doc.id, data_source_type: doc.data_source_type || '' })
    }
  }
  return docs
}, force)

const getSegments = (app: AppRecord, api: Api, doc: DocInfo, force = false) => cached(segLists, `${revision(app)}:${doc.id}`, async () => {
  const list = await paged(api, `/datasets/${encodeURIComponent(doc.dataset_id)}/documents/${encodeURIComponent(doc.id)}/segments`)
  return list.filter(seg => seg?.id).map((seg): CitationSegment => ({
    dataset_id: doc.dataset_id,
    dataset_name: doc.dataset_name,
    document_id: doc.id,
    document_name: doc.name,
    data_source_type: doc.data_source_type,
    segment_id: seg.id,
    segment_position: seg.position ?? 0,
    content: seg.content ?? '',
    word_count: seg.word_count ?? 0,
    hit_count: seg.hit_count ?? 0,
    index_node_hash: seg.index_node_hash ?? '',
  }))
}, force)

/** exactly one match, otherwise undefined (ambiguous prefixes are not guessed) */
const unique = <T>(items: T[], match: (item: T) => boolean): T | undefined => {
  const found = items.filter(match)
  return found.length === 1 ? found[0] : undefined
}

const resolveNew = async (app: AppRecord, api: Api, docPrefix: string, segPrefix: string, force: boolean) => {
  const doc = unique(await getDocs(app, api, force), d => d.id.toLowerCase().startsWith(docPrefix))
  if (!doc) { return undefined }
  return unique(await getSegments(app, api, doc, force), s => s.segment_id.toLowerCase().startsWith(segPrefix))
}

const resolveLegacy = async (app: AppRecord, api: Api, refs: string[]) => {
  const out: Record<string, CitationSegment> = {}
  const docs = await getDocs(app, api)
  const all: CitationSegment[] = []
  await pool(docs, async (doc) => { all.push(...await getSegments(app, api, doc).catch(() => [])) })
  for (const ref of refs) {
    const seg = FULL_UUID.test(ref)
      ? all.find(s => s.segment_id.toLowerCase() === ref)
      : unique(all, s => s.segment_id.toLowerCase().startsWith(ref.slice(0, PREFIX)))
    if (seg) { out[ref] = seg }
  }
  return out
}

/** Map of requested ref → segment. Unknown refs are simply absent. */
export const resolveSegments = async (app: AppRecord, refs: string[]): Promise<Record<string, CitationSegment>> => {
  const api = createApi(app)
  const out: Record<string, CitationSegment> = {}
  const legacy: string[] = []

  const fresh = refs.filter((ref) => {
    if (NEW_REF.test(ref)) { return true }
    legacy.push(ref)
    return false
  })

  const run = async (list: string[], force: boolean) => {
    await pool(list, async (ref) => {
      const [, docPrefix, segPrefix] = ref.match(NEW_REF)!
      const seg = await resolveNew(app, api, docPrefix, segPrefix, force)
      if (seg) { out[ref] = seg }
    })
  }
  await run(fresh, false)
  // misses may be documents/segments added after the cache was filled
  const missed = fresh.filter(ref => !out[ref])
  if (missed.length) { await run(missed, true) }

  if (legacy.length) { Object.assign(out, await resolveLegacy(app, api, legacy)) }
  return out
}
