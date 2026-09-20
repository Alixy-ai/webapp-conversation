import type { NextRequest } from 'next/server'
import { API_KEY, API_URL } from '@/config/server'

/**
 * Proxy the Dify file preview endpoint through this app.
 *
 * Files uploaded to Dify are served from the Dify host with a signed URL, which
 * the browser may not be able to reach (or the signature may have expired).
 * Serving them from our own origin keeps previews working everywhere.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params

  try {
    const res = await fetch(`${API_URL}/files/${fileId}/preview`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
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
