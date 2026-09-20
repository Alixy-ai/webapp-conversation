'use client'

import type { FC } from 'react'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PublicApp } from '@/lib/apps/types'

interface FormState {
  id: string
  slug: string
  name: string
  description: string
  apiKey: string
  apiUrl: string
  icon: string
  iconBackground: string
  defaultLanguage: string
  copyright: string
  privacyPolicy: string
  showPoweredBy: boolean
  enabled: boolean
}

const emptyForm = (): FormState => ({
  id: '',
  slug: '',
  name: '',
  description: '',
  apiKey: '',
  apiUrl: '',
  icon: '✦',
  iconBackground: '',
  defaultLanguage: 'en',
  copyright: '',
  privacyPolicy: '',
  showPoweredBy: false,
  enabled: true,
})

const field = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-primary-400'
const label = 'text-xs font-medium text-gray-600'

const AppsManager: FC<{ apps: PublicApp[] }> = ({ apps }) => {
  const router = useRouter()
  const [form, setForm] = useState<FormState | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState('')

  const openCreate = () => {
    setForm(emptyForm())
    setEditing(false)
    setError('')
  }

  const openEdit = (app: PublicApp) => {
    setForm({
      ...emptyForm(),
      id: app.id,
      slug: app.slug,
      name: app.name,
      description: app.description,
      apiKey: '',
      apiUrl: '',
      icon: app.icon,
      iconBackground: app.iconBackground,
      defaultLanguage: app.defaultLanguage,
      copyright: app.copyright,
      privacyPolicy: app.privacyPolicy,
      showPoweredBy: app.showPoweredBy,
      enabled: true,
    })
    setEditing(true)
    setError('')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || busy) { return }
    setBusy(true)
    setError('')

    const body: Record<string, unknown> = {
      id: form.id,
      slug: form.slug,
      name: form.name,
      description: form.description,
      icon: form.icon,
      iconBackground: form.iconBackground,
      defaultLanguage: form.defaultLanguage,
      copyright: form.copyright,
      privacyPolicy: form.privacyPolicy,
      showPoweredBy: form.showPoweredBy,
      enabled: form.enabled,
    }
    if (form.apiKey) { body.apiKey = form.apiKey }
    if (form.apiUrl) { body.apiUrl = form.apiUrl }

    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || `Save failed (${res.status})`)
        return
      }
      setForm(null)
      router.refresh()
    }
    catch {
      setError('Save failed, please retry')
    }
    finally {
      setBusy(false)
    }
  }

  const toggle = async (app: PublicApp, enabled: boolean) => {
    await fetch(`/api/admin/apps/${app.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    router.refresh()
  }

  const remove = async (app: PublicApp) => {
    if (confirming !== app.id) {
      setConfirming(app.id)
      return
    }
    setConfirming('')
    await fetch(`/api/admin/apps/${app.id}`, { method: 'DELETE' })
    router.refresh()
  }

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <div>
      <div className='mb-3 flex items-center justify-between'>
        <button
          type='button'
          onClick={openCreate}
          className='flex h-9 items-center rounded-lg bg-gray-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800'
        >
          New app
        </button>
        <button type='button' onClick={logout} className='text-xs text-gray-400 transition-colors hover:text-gray-700'>
          Sign out
        </button>
      </div>

      <ul className='space-y-2'>
        {
          apps.map(app => (
            <li key={app.id} className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base'>
                {app.icon || '✦'}
              </span>
              <div className='min-w-0 grow'>
                <div className='flex items-center gap-2'>
                  <span className='truncate text-sm font-medium text-gray-900'>{app.name}</span>
                  <span className='rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500'>/apps/{app.slug}</span>
                  {
                    !app.enabled && <span className='rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600'>disabled</span>
                  }
                </div>
                <div className='mt-0.5 truncate text-xs text-gray-400'>{app.id}</div>
              </div>
              <div className='flex shrink-0 items-center gap-3 text-xs'>
                <Link href={`/apps/${app.slug}`} target='_blank' className='text-gray-400 transition-colors hover:text-gray-700'>Open</Link>
                <button type='button' onClick={() => openEdit(app)} className='text-gray-400 transition-colors hover:text-gray-700'>Edit</button>
                <button type='button' onClick={() => toggle(app, !app.enabled)} className='text-gray-400 transition-colors hover:text-gray-700'>
                  {app.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type='button'
                  onClick={() => remove(app)}
                  onBlur={() => setConfirming('')}
                  className={confirming === app.id
                    ? 'rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600 transition-colors'
                    : 'text-red-400 transition-colors hover:text-red-600'}
                >
                  {confirming === app.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            </li>
          ))
        }
        {
          apps.length === 0 && (
            <li className='rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400'>
              No app yet — add one to start serving <code>/apps/&lt;slug&gt;</code>.
            </li>
          )
        }
      </ul>

      {
        form && (
          <form onSubmit={save} className='mt-5 rounded-2xl border border-gray-200 bg-white p-5'>
            <h2 className='text-sm font-semibold text-gray-900'>{editing ? 'Edit app' : 'New app'}</h2>

            <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div>
                <label className={label} htmlFor='id'>Dify app id</label>
                <input id='id' className={field} value={form.id} disabled={editing} onChange={e => setForm({ ...form, id: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='slug'>URL slug</label>
                <input id='slug' className={field} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
                <p className='mt-1 text-[11px] text-gray-400'>Lowercase letters, digits and dashes.</p>
              </div>
              <div>
                <label className={label} htmlFor='name'>Display name</label>
                <input id='name' className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='description'>Description</label>
                <input id='description' className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='apiKey'>API key</label>
                <input id='apiKey' className={field} type='password' placeholder={editing ? 'unchanged' : 'app-...'} value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
                <p className='mt-1 text-[11px] text-gray-400'>Stored server-side, never sent to the browser.</p>
              </div>
              <div>
                <label className={label} htmlFor='apiUrl'>API base URL</label>
                <input id='apiUrl' className={field} placeholder={editing ? 'unchanged' : 'https://api.dify.ai/v1'} value={form.apiUrl} onChange={e => setForm({ ...form, apiUrl: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='icon'>Icon (emoji or image URL)</label>
                <input id='icon' className={field} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='iconBackground'>Icon background</label>
                <input id='iconBackground' className={field} placeholder='#CCFBF1' value={form.iconBackground} onChange={e => setForm({ ...form, iconBackground: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='defaultLanguage'>Default language</label>
                <input id='defaultLanguage' className={field} value={form.defaultLanguage} onChange={e => setForm({ ...form, defaultLanguage: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor='copyright'>Copyright</label>
                <input id='copyright' className={field} value={form.copyright} onChange={e => setForm({ ...form, copyright: e.target.value })} />
              </div>
              <div className='sm:col-span-2'>
                <label className={label} htmlFor='privacyPolicy'>Privacy policy URL</label>
                <input id='privacyPolicy' className={field} value={form.privacyPolicy} onChange={e => setForm({ ...form, privacyPolicy: e.target.value })} />
              </div>
            </div>

            <div className='mt-4 flex items-center gap-5 text-xs text-gray-600'>
              <label className='flex items-center gap-2'>
                <input type='checkbox' checked={form.showPoweredBy} onChange={e => setForm({ ...form, showPoweredBy: e.target.checked })} />
                Show &quot;Powered by Dify&quot;
              </label>
              <label className='flex items-center gap-2'>
                <input type='checkbox' checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                Enabled
              </label>
            </div>

            {
              error && <div className='mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600'>{error}</div>
            }

            <div className='mt-5 flex items-center gap-3'>
              <button
                type='submit'
                disabled={busy}
                className='flex h-9 items-center rounded-lg bg-gray-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type='button' onClick={() => setForm(null)} className='text-sm text-gray-400 transition-colors hover:text-gray-700'>
                Cancel
              </button>
            </div>
          </form>
        )
      }
    </div>
  )
}

export default AppsManager
