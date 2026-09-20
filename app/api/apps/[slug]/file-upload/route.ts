import type { NextRequest } from 'next/server'
import { appNotFound, getClient, getInfo } from '@/app/api/utils/common'
import { resolveApp } from '@/lib/apps/registry'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { return appNotFound() }

  try {
    const formData = await request.formData()
    const { user } = getInfo(request, app)
    formData.append('user', user)
    const res = await getClient(app).fileUpload(formData)
    return new Response(res.data.id as any)
  }
  catch (e: any) {
    return new Response(e.message)
  }
}
