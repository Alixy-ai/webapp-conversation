import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appNotFound, getClient, getInfo, setSession } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function DELETE(request: NextRequest, { params }: {
  params: Promise<{ slug: string, conversationId: string }>
}) {
  const { slug, conversationId } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  const { sessionId, user } = getInfo(request, app)
  try {
    const { data }: any = await getClient(app).deleteConversation(conversationId, user)
    return NextResponse.json(data ?? { result: 'success' }, {
      headers: setSession(sessionId, app),
    })
  }
  catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 })
  }
}
