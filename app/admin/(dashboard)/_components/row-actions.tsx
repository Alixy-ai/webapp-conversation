'use client'

import type { FC } from 'react'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiDeleteBinLine, RiEditLine } from '@remixicon/react'

import AppDialog, { appToForm } from './app-dialog'
import type { PublicApp } from '@/lib/apps/types'
import { API_PREFIX } from '@/config'

const action = 'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50'

const RowActions: FC<{ app: PublicApp }> = ({ app }) => {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      await fetch(`${API_PREFIX}/admin/apps/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !app.enabled }),
      })
      router.refresh()
    }
    finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await fetch(`${API_PREFIX}/admin/apps/${app.id}`, { method: 'DELETE' })
      setConfirming(false)
      router.refresh()
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <button type='button' className={action} onClick={() => setEditing(true)}>
        <RiEditLine className='h-3.5 w-3.5' />
        Edit
      </button>
      <button type='button' className={action} disabled={busy} onClick={toggle}>
        {app.enabled ? 'Disable' : 'Enable'}
      </button>
      <button
        type='button'
        disabled={busy}
        onClick={remove}
        onBlur={() => setConfirming(false)}
        className={confirming
          ? 'flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-2.5 text-xs font-medium text-red-600'
          : `${action} hover:bg-red-50 hover:text-red-600`}
      >
        <RiDeleteBinLine className='h-3.5 w-3.5' />
        {confirming ? 'Confirm' : 'Delete'}
      </button>
      {
        editing && (
          <AppDialog
            title={`Edit ${app.name}`}
            submitLabel='Save changes'
            initial={appToForm(app)}
            lockId
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false)
              router.refresh()
            }}
          />
        )
      }
    </div>
  )
}

export default RowActions
