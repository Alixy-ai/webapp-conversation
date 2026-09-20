import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveApps } from '@/lib/apps/registry'

const AppIndex: FC = async () => {
  const apps = await resolveApps()

  if (apps.length === 1) { redirect(`/apps/${apps[0].slug}`) }

  if (apps.length === 0) {
    return (
      <main className='flex h-full items-center justify-center bg-gray-50 p-6'>
        <div className='max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center'>
          <h1 className='text-base font-semibold text-gray-900'>No app is configured yet</h1>
          <p className='mt-2 text-sm text-gray-500'>
            Set NEXT_PUBLIC_APP_ID and APP_KEY, or add a row to the registry
            (<code className='rounded bg-gray-100 px-1'>data/apps.db</code>).
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className='flex h-full items-center justify-center bg-gray-50 p-6'>
      <div className='w-full max-w-md'>
        <h1 className='mb-4 text-sm font-medium text-gray-500'>Available apps</h1>
        <ul className='space-y-2'>
          {
            apps.map(app => (
              <li key={app.id}>
                <Link
                  href={`/apps/${app.slug}`}
                  className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-25'
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base'>
                    {app.icon || '✦'}
                  </span>
                  <span className='min-w-0'>
                    <span className='block truncate text-sm font-medium text-gray-900'>{app.name}</span>
                    <span className='block truncate text-xs text-gray-400'>/apps/{app.slug}</span>
                  </span>
                </Link>
              </li>
            ))
          }
        </ul>
      </div>
    </main>
  )
}

export default AppIndex
