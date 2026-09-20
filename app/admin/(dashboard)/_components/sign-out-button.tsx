'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiLogoutBoxRLine } from '@remixicon/react'

import { API_PREFIX } from '@/config'

const SignOutButton = () => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    if (busy) { return }
    setBusy(true)
    try {
      await fetch(`${API_PREFIX}/admin/auth/logout`, { method: 'POST' })
      router.replace('/admin/login')
      router.refresh()
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      onClick={signOut}
      disabled={busy}
      className='flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50'
    >
      <RiLogoutBoxRLine className='h-3.5 w-3.5' />
      Sign out
    </button>
  )
}

export default SignOutButton
