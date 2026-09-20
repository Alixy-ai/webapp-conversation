import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appNotFound, getClient, getInfo } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ slug: string, conversationId: string }>
}) {
  const { slug, conversationId } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  const body = await request.json()
  const {
    auto_generate,
    name,
  } = body
  const { user } = getInfo(request, app)

  // auto generate name
  const { data } = await getClient(app).renameConversation(conversationId, name, user, auto_generate)
  return NextResponse.json(data)
}
