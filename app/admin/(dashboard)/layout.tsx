import type { FC } from 'react'
import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import SignOutButton from './_components/sign-out-button'
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/admin/auth'
import { ensureAppsSeeded, listApps } from '@/lib/apps/registry'
import { toPublicApp } from '@/lib/apps/types'

const NAV = [
  { href: '/admin', label: 'Apps' },
]

const DashboardLayout: FC<{ children: React.ReactNode }> = async ({ children }) => {
  const session = verifySessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)
  if (!session) { redirect('/admin/login') }

  await ensureAppsSeeded()
  const apps = listApps(false).map(toPublicApp)

  return (
    <div className='flex min-h-screen bg-gray-50 text-gray-900'>
      {/* sidebar */}
      <aside className='hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex'>
        <div className='flex h-14 items-center gap-2.5 border-b border-gray-100 px-4'>
          <span className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-sm font-semibold text-white'>✦</span>
          <span className='min-w-0'>
            <span className='block truncate text-sm font-semibold leading-tight'>Chat Apps</span>
            <span className='block text-[11px] leading-tight text-gray-400'>Admin</span>
          </span>
        </div>

        <nav className='flex-1 overflow-y-auto p-3'>
          <p className='px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400'>Manage</p>
          {
            NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className='mb-0.5 flex h-9 items-center gap-2.5 rounded-lg bg-gray-50 px-2.5 text-sm font-medium text-gray-900'
              >
                <span className='h-4 w-0.5 rounded-full bg-primary-500' />
                {item.label}
                <span className='ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-gray-500'>{apps.length}</span>
              </Link>
            ))
          }

          <p className='px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wide text-gray-400'>Live apps</p>
          {
            apps.length === 0 && (
              <p className='px-2.5 py-1 text-xs text-gray-400'>Nothing published yet.</p>
            )
          }
          {
            apps.map(app => (
              <Link
                key={app.id}
                href={`/apps/${app.slug}`}
                target='_blank'
                className='group mb-0.5 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900'
              >
                <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[11px]'>
                  {app.icon || '✦'}
                </span>
                <span className='truncate'>{app.name}</span>
                <span className='ml-auto text-[11px] text-gray-300 transition-colors group-hover:text-gray-400'>/{app.slug}</span>
              </Link>
            ))
          }
        </nav>
      </aside>

      {/* main column */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur lg:px-8'>
          {/* mobile navigation */}
          <details className='relative lg:hidden'>
            <summary className='flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 text-gray-500'>
              <span className='sr-only'>Open navigation</span>
              <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                <path d='M2 4h12M2 8h12M2 12h12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
            </summary>
            <div className='absolute left-0 top-11 z-30 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg'>
              <Link href='/admin' className='block rounded-lg px-2.5 py-2 text-sm font-medium text-gray-900'>Apps</Link>
              {
                apps.map(app => (
                  <Link key={app.id} href={`/apps/${app.slug}`} target='_blank' className='block truncate rounded-lg px-2.5 py-2 text-sm text-gray-600'>
                    {app.icon || '✦'} {app.name}
                  </Link>
                ))
              }
            </div>
          </details>

          <div className='flex min-w-0 items-center gap-2 text-sm'>
            <span className='font-medium text-gray-900'>Admin</span>
            <span className='text-gray-300'>/</span>
            <span className='truncate text-gray-500'>Apps</span>
          </div>

          <div className='ml-auto flex items-center gap-3'>
            <span className='hidden items-center gap-2 sm:flex'>
              <span className='flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium uppercase text-gray-600'>
                {session.u.slice(0, 1)}
              </span>
              <span className='text-xs text-gray-500'>{session.u}</span>
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8'>
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
