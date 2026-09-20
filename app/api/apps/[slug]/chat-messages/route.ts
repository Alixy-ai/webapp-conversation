import type { NextRequest } from 'next/server'
import { appNotFound, getClient, getInfo } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  const body = await request.json()
  const {
    inputs,
    query,
    files,
    conversation_id: conversationId,
    response_mode: responseMode,
  } = body
  const { user } = getInfo(request, app)
  const res = await getClient(app).createChatMessage(inputs, query, user, responseMode, conversationId, files)
  return new Response(res.data as any)
}
