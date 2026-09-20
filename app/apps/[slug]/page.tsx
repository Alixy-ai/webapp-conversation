import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { FC } from 'react'
import React from 'react'

import Main from '@/app/components'
import { AppProvider } from '@/app/components/app-context'
import { resolveApp } from '@/lib/apps/registry'
import { toPublicApp } from '@/lib/apps/types'
import { buildFaviconUrl } from '@/utils/branding'
import { BASE_PATH } from '@/config'

/** App-rooted favicon URLs ('/logo.png') follow the sub-path; data:/http(s) URLs pass through. */
const faviconUrl = (icon: string) => {
  const url = buildFaviconUrl(icon)
  return url.startsWith('/') ? `${BASE_PATH}${url}` : url
}

interface IAppPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: IAppPageProps): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { return { title: 'Not found' } }

  return {
    title: app.name,
    description: app.description,
    icons: app.icon ? { icon: faviconUrl(app.icon) } : undefined,
  }
}

const AppPage: FC<IAppPageProps> = async ({ params }) => {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) { notFound() }

  const publicApp = toPublicApp(app)

  return (
    <AppProvider app={publicApp}>
      <Main app={publicApp} />
    </AppProvider>
  )
}

export default AppPage
