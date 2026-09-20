import type { NextRequest } from 'next/server'
import { appNotFound } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

/**
 * Proxy the Dify file preview endpoint through this app.
 *
 * Files uploaded to Dify are served from the Dify host with a signed URL, which
 * the browser may not be able to reach (or the signature may have expired).
 * Serving them from our own origin keeps previews working everywhere.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string, fileId: string }> },
) {
  const { slug, fileId } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  try {
    const res = await fetch(`${app.apiUrl}/files/${fileId}/preview`, {
      headers: {
        Authorization: `Bearer ${app.apiKey}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) { return new Response(null, { status: res.status }) }

    const headers = new Headers()
    const contentType = res.headers.get('content-type')
    if (contentType) { headers.set('Content-Type', contentType) }
    headers.set('Cache-Control', 'private, max-age=3600')

    return new Response(res.body, { headers })
  }
  catch {
    return new Response(null, { status: 502 })
  }
}
