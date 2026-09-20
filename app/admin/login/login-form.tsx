'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <form onSubmit={submit} className='w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
      <h1 className='text-base font-semibold text-gray-900'>Admin sign in</h1>
      <p className='mt-1 text-xs text-gray-500'>Manage the Dify apps served by this deployment.</p>

      <label className='mt-5 block text-xs font-medium text-gray-600' htmlFor='username'>Username</label>
      <input
        id='username'
        className='mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-primary-400'
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoComplete='username'
        autoFocus
      />

      <label className='mt-4 block text-xs font-medium text-gray-600' htmlFor='password'>Password</label>
      <input
        id='password'
        type='password'
        className='mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-primary-400'
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete='current-password'
      />

      {
        error && <div className='mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600'>{error}</div>
      }

      <button
        type='submit'
        disabled={busy || !username || !password}
        className='mt-5 flex h-9 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

export default LoginForm
