'use client'

import type { FC } from 'react'
import React, { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export const PAGE_SIZES = [10, 25, 50]

interface PageSizeSelectProps {
  pageSize: number
  query: string
}

const PageSizeSelect: FC<PageSizeSelectProps> = ({ pageSize, query }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const change = (size: number) => {
    const params = new URLSearchParams()
    if (query) { params.set('q', query) }
    if (size !== 10) { params.set('pageSize', String(size)) }
    const search = params.toString()
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname))
  }

  return (
    <label className='flex items-center gap-2 text-xs text-gray-500'>
      Rows
      <select
        value={pageSize}
        aria-label='Rows per page'
        className='h-8 cursor-pointer rounded-lg border border-gray-200 bg-white pl-2 pr-7 text-xs text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:border-primary-400'
        onChange={e => change(Number(e.target.value))}
      >
        {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
  )
}

export default PageSizeSelect
