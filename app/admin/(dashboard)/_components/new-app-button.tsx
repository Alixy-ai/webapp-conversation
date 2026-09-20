'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiAddLine } from '@remixicon/react'

import AppDialog, { emptyAppForm } from './app-dialog'

const NewAppButton = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800'
      >
        <RiAddLine className='h-4 w-4' />
        New app
      </button>
      {
        open && (
          <AppDialog
            title='Connect a Dify app'
            submitLabel='Create app'
            initial={emptyAppForm()}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false)
              router.refresh()
            }}
          />
        )
      }
    </>
  )
}

export default NewAppButton
