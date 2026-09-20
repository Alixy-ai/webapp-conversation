'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiLockLine } from '@remixicon/react'

const input = 'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-shadow focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15'
const label = 'mb-1.5 block text-xs font-medium text-gray-600'

const LoginForm = () => {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) { return }
    setBusy(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || `Sign in failed (${res.status})`)
        return
      }
      router.replace('/admin')
      router.refresh()
    }
    catch {
      setError('Sign in failed, please retry')
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className='w-full max-w-sm'>
      <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-base font-semibold text-white'>✦</span>
      <h1 className='mt-5 text-lg font-semibold text-gray-900'>Sign in</h1>
      <p className='mt-1 text-sm text-gray-500'>Manage the Dify apps served by this deployment.</p>

      <div className='mt-6'>
        <label className={label} htmlFor='username'>Username</label>
        <input
          id='username'
          className={input}
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete='username'
          autoFocus
        />
      </div>

      <div className='mt-4'>
        <label className={label} htmlFor='password'>Password</label>
        <input
          id='password'
          type='password'
          className={input}
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete='current-password'
        />
      </div>

      {
        error && (
          <div className='mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600'>
            <RiLockLine className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>{error}</span>
          </div>
        )
      }

      <button
        type='submit'
        disabled={busy || !username || !password}
        className='mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <p className='mt-6 text-center text-[11px] text-gray-400'>
        Sessions expire after 12 hours · 5 failed attempts are throttled
      </p>
    </form>
  )
}

export default LoginForm
