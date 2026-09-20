'use client'

import type { FC } from 'react'
import React, { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { RiCloseLine, RiSearchLine } from '@remixicon/react'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  /** current query, taken from the URL by the server component */
  initialQuery: string
  pageSize: number
}

const SearchInput: FC<SearchInputProps> = ({ initialQuery, pageSize }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initialQuery)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // keep the field in sync when the URL changes from the outside (back/forward)
  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current) }
  }, [])

  const navigate = (nextQuery: string, immediate = false) => {
    if (timer.current) { clearTimeout(timer.current) }

    const go = () => {
      const params = new URLSearchParams()
      const query = nextQuery.trim()
      if (query) { params.set('q', query) }
      // a new search always starts on the first page
      if (pageSize !== 10) { params.set('pageSize', String(pageSize)) }
      const search = params.toString()
      startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname))
    }

    if (immediate) { go() }
    else { timer.current = setTimeout(go, DEBOUNCE_MS) }
  }

  return (
    <div className='relative w-full sm:w-72'>
      <RiSearchLine className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
      <input
        type='search'
        value={value}
        aria-label='Search apps'
        placeholder='Search name, slug or app id'
        className='block w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-shadow focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 [&::-webkit-search-cancel-button]:hidden'
        onChange={(e) => {
          setValue(e.target.value)
          navigate(e.target.value)
        }}
      />
      {
        value && (
          <button
            type='button'
            aria-label='Clear search'
            className='absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'
            onClick={() => {
              setValue('')
              navigate('', true)
            }}
          >
            <RiCloseLine className='h-4 w-4' />
          </button>
        )
      }
      {
        pending && (
          <span className='absolute -bottom-5 left-1 text-[11px] text-gray-400'>searching…</span>
        )
      }
    </div>
  )
}

export default SearchInput
