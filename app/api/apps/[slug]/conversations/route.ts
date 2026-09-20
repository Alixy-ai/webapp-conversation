import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appNotFound, getClient, getInfo, setSession } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function GET(request: NextRequest, { params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  const { sessionId, user } = getInfo(request, app)
  try {
    const { data }: any = await getClient(app).getConversations(user)
    return NextResponse.json(data, {
      headers: setSession(sessionId, app),
    })
  }
  catch (error: any) {
    return NextResponse.json({
      data: [],
      error: error.message,
    })
  }
}
