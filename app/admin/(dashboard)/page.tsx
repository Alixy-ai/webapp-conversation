import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { RiArrowRightUpLine } from '@remixicon/react'

import NewAppButton from './_components/new-app-button'
import RowActions from './_components/row-actions'
import { ensureAppsSeeded, listApps } from '@/lib/apps/registry'
import { toPublicApp } from '@/lib/apps/types'

const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const StatCard: FC<{ label: string, value: number | string, hint?: string }> = ({ label, value, hint }) => (
  <div className='rounded-xl border border-gray-200 bg-white px-4 py-3.5'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-1 text-2xl font-semibold leading-none text-gray-900'>{value}</p>
    {hint && <p className='mt-1.5 text-[11px] text-gray-400'>{hint}</p>}
  </div>
)

const AdminPage: FC = async () => {
  await ensureAppsSeeded()
  const apps = listApps(true).map(toPublicApp)
  const active = apps.filter(app => app.enabled).length

  return (
    <div>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-lg font-semibold text-gray-900'>Apps</h1>
          <p className='mt-1 text-sm text-gray-500'>
            Every connected Dify app is served from its own URL.
          </p>
        </div>
        <NewAppButton />
      </div>

      <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <StatCard label='Connected apps' value={apps.length} hint='rows in the registry' />
        <StatCard label='Active' value={active} hint='reachable by URL' />
        <StatCard label='Disabled' value={apps.length - active} hint='hidden from visitors' />
      </div>

      <section className='mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white'>
        <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3'>
          <h2 className='text-sm font-medium text-gray-900'>All apps</h2>
          <span className='text-xs text-gray-400'>{apps.length} total</span>
        </div>

        {
          apps.length === 0
            ? (
              <div className='px-4 py-14 text-center'>
                <p className='text-sm font-medium text-gray-900'>No app connected yet</p>
                <p className='mx-auto mt-1 max-w-sm text-xs text-gray-500'>
                  Connect a Dify app to publish it at <code className='rounded bg-gray-100 px-1'>/apps/&lt;slug&gt;</code>.
                </p>
              </div>
            )
            : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[720px] border-collapse text-left'>
                  <thead>
                    <tr className='border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400'>
                      <th className='px-4 py-2.5 font-medium'>App</th>
                      <th className='px-4 py-2.5 font-medium'>URL</th>
                      <th className='px-4 py-2.5 font-medium'>Status</th>
                      <th className='px-4 py-2.5 font-medium'>Updated</th>
                      <th className='px-4 py-2.5 text-right font-medium'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      apps.map(app => (
                        <tr key={app.id} className='border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-25'>
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-3'>
                              <span
                                className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base'
                                style={app.iconBackground ? { background: app.iconBackground } : undefined}
                              >
                                {app.icon || '✦'}
                              </span>
                              <span className='min-w-0'>
                                <span className='block truncate text-sm font-medium text-gray-900'>{app.name}</span>
                                <span className='block truncate text-xs text-gray-400'>{app.id}</span>
                              </span>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <Link
                              href={`/apps/${app.slug}`}
                              target='_blank'
                              className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900'
                            >
                              /apps/{app.slug}
                              <RiArrowRightUpLine className='h-3 w-3' />
                            </Link>
                          </td>
                          <td className='px-4 py-3'>
                            <span className={app.enabled
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700'
                              : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500'}
                            >
                              <span className={app.enabled ? 'h-1.5 w-1.5 rounded-full bg-primary-500' : 'h-1.5 w-1.5 rounded-full bg-gray-400'} />
                              {app.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className='px-4 py-3 text-xs text-gray-500'>{formatDate(app.updatedAt)}</td>
                          <td className='px-4 py-3'>
                            <RowActions app={app} />
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )
        }
      </section>
    </div>
  )
}

export default AdminPage
