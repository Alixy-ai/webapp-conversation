import type { Metadata } from 'next'
import { APP_INFO, appIcon } from '@/config'
import { getLocaleOnServer } from '@/i18n/server'
import { buildFaviconUrl } from '@/utils/branding'

import './styles/globals.css'
import './styles/markdown.scss'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: APP_INFO.title,
    description: APP_INFO.description,
    icons: appIcon ? { icon: buildFaviconUrl(appIcon) } : undefined,
  }
}

const LocaleLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = await getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className="h-full">
      <body className="h-full">
        <div className="overflow-x-auto">
          <div className="w-screen h-screen min-w-[300px]">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

export default LocaleLayout
