import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appNotFound, getClient, getInfo } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ slug: string, messageId: string }>
}) {
  const { slug, messageId } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  const body = await request.json()
  const {
    rating,
  } = body
  const { user } = getInfo(request, app)
  const { data } = await getClient(app).messageFeedback(messageId, rating, user)
  return NextResponse.json(data)
}
