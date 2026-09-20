import type { FC } from 'react'
import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import AppsManager from './apps-manager'
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/admin/auth'
import { ensureAppsSeeded, listApps } from '@/lib/apps/registry'
import { toPublicApp } from '@/lib/apps/types'

const AdminPage: FC = async () => {
  const session = verifySessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)
  if (!session) { redirect('/admin/login') }

  await ensureAppsSeeded()
  const apps = listApps(true).map(toPublicApp)

  return (
    <main className='min-h-full bg-gray-50 p-6'>
      <div className='mx-auto max-w-4xl'>
        <header className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-base font-semibold text-gray-900'>Dify apps</h1>
            <p className='mt-1 text-xs text-gray-500'>
              Each app is served from its own URL: <code className='rounded bg-gray-100 px-1'>/apps/&lt;slug&gt;</code>
            </p>
          </div>
          <span className='text-xs text-gray-400'>signed in as {session.u}</span>
        </header>
        <AppsManager apps={apps} />
      </div>
    </main>
  )
}

export default AdminPage
