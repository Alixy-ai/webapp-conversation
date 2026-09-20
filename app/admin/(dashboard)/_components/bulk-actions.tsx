'use client'

import type { FC } from 'react'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiCloseLine, RiDeleteBinLine } from '@remixicon/react'

import { useSelection } from './selection'

type BulkAction = 'enable' | 'disable' | 'delete'

const button = 'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-50'

/** Floating action bar that acts on every selected row. */
const BulkActions: FC = () => {
  const router = useRouter()
  const { selected, clear } = useSelection()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  if (selected.length === 0) { return null }

  const run = async (action: BulkAction) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/apps/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || `Failed (${res.status})`)
        return
      }
      setConfirming(false)
      clear()
      router.refresh()
    }
    catch {
      setError('Request failed, please retry')
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4'>
      <div className='pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg'>
        <span className='text-xs font-medium text-gray-700'>
          {selected.length} selected
        </span>
        <span className='h-4 w-px bg-gray-200' />
        {
          error
            ? <span className='text-xs text-red-600'>{error}</span>
            : (
              <div className='flex items-center gap-1'>
                <button type='button' className={`${button} text-gray-600 hover:bg-gray-100 hover:text-gray-900`} disabled={busy} onClick={() => run('enable')}>
                  Enable
                </button>
                <button type='button' className={`${button} text-gray-600 hover:bg-gray-100 hover:text-gray-900`} disabled={busy} onClick={() => run('disable')}>
                  Disable
                </button>
                {
                  confirming
                    ? (
                      <span className='flex items-center gap-1'>
                        <span className='px-1 text-xs text-red-600'>Delete {selected.length} app{selected.length > 1 ? 's' : ''}?</span>
                        <button type='button' className={`${button} bg-red-50 text-red-600`} disabled={busy} onClick={() => run('delete')}>
                          Confirm
                        </button>
                        <button type='button' className={`${button} text-gray-500 hover:bg-gray-100`} disabled={busy} onClick={() => setConfirming(false)}>
                          Cancel
                        </button>
                      </span>
                    )
                    : (
                      <button
                        type='button'
                        className={`${button} text-red-500 hover:bg-red-50 hover:text-red-600`}
                        disabled={busy}
                        onClick={() => setConfirming(true)}
                      >
                        <RiDeleteBinLine className='h-3.5 w-3.5' />
                        Delete
                      </button>
                    )
                }
              </div>
            )
        }
        <span className='h-4 w-px bg-gray-200' />
        <button type='button' aria-label='Clear selection' className='flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700' onClick={clear}>
          <RiCloseLine className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

export default BulkActions
