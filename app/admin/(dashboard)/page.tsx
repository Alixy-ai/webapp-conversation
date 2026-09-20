import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { RiArrowRightUpLine } from '@remixicon/react'

import BulkActions from './_components/bulk-actions'
import PageSizeSelect from './_components/page-size-select'
import NewAppButton from './_components/new-app-button'
import RowActions from './_components/row-actions'
import SearchInput from './_components/search-input'
import { RowCheckbox, SelectAllCheckbox, SelectionProvider } from './_components/selection'
import { countApps, ensureAppsSeeded, queryApps } from '@/lib/apps/registry'
import { toPublicApp } from '@/lib/apps/types'

const DEFAULT_PAGE_SIZE = 10

interface IAdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || ''

const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** [1, '…', 4, 5, 6, '…', 12] */
const pageItems = (current: number, pageCount: number): (number | '…')[] => {
  if (pageCount <= 7) { return Array.from({ length: pageCount }, (_, index) => index + 1) }

  const items: (number | '…')[] = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(pageCount - 1, current + 1)
  if (from > 2) { items.push('…') }
  for (let page = from; page <= to; page++) { items.push(page) }
  if (to < pageCount - 1) { items.push('…') }
  items.push(pageCount)
  return items
}

const StatCard: FC<{ label: string, value: number | string, hint: string }> = ({ label, value, hint }) => (
  <div className='rounded-xl border border-gray-200 bg-white px-4 py-3.5'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-1 text-2xl font-semibold leading-none text-gray-900'>{value}</p>
    <p className='mt-1.5 text-[11px] text-gray-400'>{hint}</p>
  </div>
)

const StatusPill: FC<{ enabled: boolean }> = ({ enabled }) => (
  <span className={enabled
    ? 'inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700'
    : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500'}
  >
    <span className={enabled ? 'h-1.5 w-1.5 rounded-full bg-primary-500' : 'h-1.5 w-1.5 rounded-full bg-gray-400'} />
    {enabled ? 'Active' : 'Disabled'}
  </span>
)

const AdminPage: FC<IAdminPageProps> = async ({ searchParams }) => {
  const params = await searchParams
  const query = first(params.q).trim()
  const requestedSize = Number(first(params.pageSize)) || DEFAULT_PAGE_SIZE
  const requestedPage = Number(first(params.page)) || 1

  await ensureAppsSeeded()
  const counts = countApps()
  const { apps, total, page, pageSize, pageCount } = queryApps({
    includeDisabled: true,
    search: query,
    page: requestedPage,
    pageSize: requestedSize,
  })
  const rows = apps.map(toPublicApp)
  const ids = rows.map(app => app.id)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const href = (next: { page?: number, pageSize?: number, q?: string }) => {
    const search = new URLSearchParams()
    const nextQuery = next.q ?? query
    if (nextQuery) { search.set('q', nextQuery) }
    const nextSize = next.pageSize ?? pageSize
    if (nextSize !== DEFAULT_PAGE_SIZE) { search.set('pageSize', String(nextSize)) }
    const nextPage = next.page ?? 1
    if (nextPage > 1) { search.set('page', String(nextPage)) }
    const qs = search.toString()
    return qs ? `/admin?${qs}` : '/admin'
  }

  const pagerLink = 'flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900'

  return (
    <div>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-lg font-semibold text-gray-900'>Apps</h1>
          <p className='mt-1 text-sm text-gray-500'>Every connected Dify app is served from its own URL.</p>
        </div>
        <NewAppButton />
      </div>

      <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <StatCard label='Connected apps' value={counts.total} hint='rows in the registry' />
        <StatCard label='Active' value={counts.active} hint='reachable by URL' />
        <StatCard label='Disabled' value={counts.total - counts.active} hint='hidden from visitors' />
      </div>

      <section className='mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <SearchInput initialQuery={query} pageSize={pageSize} />
            <span className='text-xs text-gray-400'>
              {query ? `${total} match${total === 1 ? '' : 'es'}` : `${total} total`}
            </span>
          </div>
          <PageSizeSelect pageSize={pageSize} query={query} />
        </div>

        <SelectionProvider key={`${query}|${page}|${pageSize}`}>
          {
            rows.length === 0
              ? (
                <div className='px-4 py-14 text-center'>
                  <p className='text-sm font-medium text-gray-900'>
                    {query ? 'No app matches your search' : 'No app connected yet'}
                  </p>
                  <p className='mx-auto mt-1 max-w-sm text-xs text-gray-500'>
                    {
                      query
                        ? <>Nothing matches <span className='font-medium text-gray-700'>{query}</span>.</>
                        : <span>Connect a Dify app to publish it at <code className='rounded bg-gray-100 px-1'>/apps/&lt;slug&gt;</code>.</span>
                    }
                  </p>
                  {
                    query && (
                      <Link href='/admin' className='mt-3 inline-flex h-8 items-center rounded-lg border border-gray-200 px-3 text-xs text-gray-600 transition-colors hover:bg-gray-50'>
                        Clear search
                      </Link>
                    )
                  }
                </div>
              )
              : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[760px] border-collapse text-left'>
                    <thead>
                      <tr className='border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400'>
                        <th className='w-10 px-4 py-2.5'>
                          <SelectAllCheckbox ids={ids} />
                        </th>
                        <th className='px-4 py-2.5 font-medium'>App</th>
                        <th className='px-4 py-2.5 font-medium'>URL</th>
                        <th className='px-4 py-2.5 font-medium'>Status</th>
                        <th className='px-4 py-2.5 font-medium'>Updated</th>
                        <th className='px-4 py-2.5 text-right font-medium'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        rows.map(app => (
                          <tr key={app.id} className='border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-25'>
                            <td className='px-4 py-3'>
                              <RowCheckbox id={app.id} label={app.name} />
                            </td>
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
                              <StatusPill enabled={app.enabled} />
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

          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3'>
            <span className='text-xs text-gray-400'>
              {
                total === 0
                  ? 'No apps to show'
                  : `Showing ${from}–${to} of ${total}`
              }
            </span>
            {
              pageCount > 1 && (
                <nav className='flex items-center gap-1' aria-label='Pagination'>
                  {
                    page > 1
                      ? <Link href={href({ page: page - 1 })} className={pagerLink}>Prev</Link>
                      : <span className={`${pagerLink} cursor-not-allowed text-gray-300`}>Prev</span>
                  }
                  {
                    pageItems(page, pageCount).map((item, index) => (
                      item === '…'
                        ? <span key={`gap-${index}`} className='px-1 text-xs text-gray-300'>…</span>
                        : (
                          <Link
                            key={item}
                            href={href({ page: item })}
                            className={item === page
                              ? 'flex h-8 min-w-8 items-center justify-center rounded-lg bg-gray-900 px-2 text-xs font-medium text-white'
                              : pagerLink}
                          >
                            {item}
                          </Link>
                        )
                    ))
                  }
                  {
                    page < pageCount
                      ? <Link href={href({ page: page + 1 })} className={pagerLink}>Next</Link>
                      : <span className={`${pagerLink} cursor-not-allowed text-gray-300`}>Next</span>
                  }
                </nav>
              )
            }
          </div>

          <BulkActions />
        </SelectionProvider>
      </section>
    </div>
  )
}

export default AdminPage
