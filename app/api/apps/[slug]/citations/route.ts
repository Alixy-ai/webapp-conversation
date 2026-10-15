import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appNotFound } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'
import { resolveSegments } from '@/lib/citations/segment-index'
import { MAX_REFS, REF_RE } from '@/utils/citation'

/**
 * POST { refs: string[] } → { citations: { [ref]: CitationItem } }
 * Only resolves refs the workflow put into an answer; the Knowledge API key
 * never leaves the server.
 */
export async function POST(request: NextRequest, { params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }
  if (!app.citationEnabled || !app.citationApiKey) {
    return NextResponse.json({ citations: {} })
  }

  const body = await request.json().catch(() => null) as { refs?: unknown } | null
  const refs = Array.isArray(body?.refs)
    ? Array.from(new Set(body!.refs.filter((r): r is string => typeof r === 'string' && REF_RE.test(r)).map(r => r.toLowerCase()))).slice(0, MAX_REFS)
    : []
  if (!refs.length) { return NextResponse.json({ citations: {} }) }

  try {
    const found = await resolveSegments(app, refs)
    const citations: Record<string, unknown> = {}
    for (const [ref, seg] of Object.entries(found)) {
      citations[ref] = { ...seg, score: 0 }
    }
    return NextResponse.json({ citations })
  }
  catch (e: any) {
    console.error(`[citations] ${slug}: ${e?.message || e}`)
    return NextResponse.json({ citations: {}, error: 'knowledge lookup failed' }, { status: 502 })
  }
}
