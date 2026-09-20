'use client'

import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { RiCheckLine, RiCloseLine } from '@remixicon/react'
import type { PublicApp } from '@/lib/apps/types'
import { AI_NOTICE_POSITIONS, AI_NOTICE_TEXT_MAX_LEN, DEFAULT_AI_NOTICE_POSITION } from '@/config'
import type { AiNoticePosition } from '@/config'

export interface AppFormValues {
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
  aiNoticeEnabled: boolean
  aiNoticeText: string
  aiNoticePosition: AiNoticePosition
  enabled: boolean
}

export const emptyAppForm = (): AppFormValues => ({
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
  aiNoticeEnabled: false,
  aiNoticeText: '',
  aiNoticePosition: DEFAULT_AI_NOTICE_POSITION,
  enabled: true,
})

export const appToForm = (app: PublicApp): AppFormValues => ({
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
  aiNoticeEnabled: app.aiNoticeEnabled,
  aiNoticeText: app.aiNoticeText,
  aiNoticePosition: app.aiNoticePosition,
  enabled: app.enabled,
})

const input = 'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-shadow focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15'
const label = 'mb-1.5 block text-xs font-medium text-gray-600'

export const AI_NOTICE_POSITION_LABELS: Record<AiNoticePosition, string> = {
  input_hint: 'Below the input box (hint)',
  answer_footer: 'Below every answer',
}

interface AppDialogProps {
  title: string
  submitLabel: string
  initial: AppFormValues
  /** the Dify app id cannot be changed once the app exists */
  lockId?: boolean
  onClose: () => void
  onSaved: () => void
}

const AppDialog: FC<AppDialogProps> = ({
  title,
  submitLabel,
  initial,
  lockId = false,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<AppFormValues>(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const set = <K extends keyof AppFormValues>(key: K, value: AppFormValues[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) { return }
    // a new app is unreachable without a key; editing keeps the stored one
    if (!lockId && !form.apiKey.trim()) {
      setError('The API key is required to connect a new app.')
      return
    }
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
      aiNoticeEnabled: form.aiNoticeEnabled,
      aiNoticeText: form.aiNoticeText.trim(),
      aiNoticePosition: form.aiNoticePosition,
      enabled: form.enabled,
    }
    // blank means "keep what is stored" — the key never leaves the server
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
      onSaved()
    }
    catch {
      setError('Save failed, please retry')
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/25 p-4 backdrop-blur-[2px] sm:p-8'>
      <div className='absolute inset-0' onClick={onClose} aria-hidden='true' />
      <form
        onSubmit={save}
        className='relative z-10 my-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl'
      >
        <div className='flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4'>
          <div>
            <h2 className='text-sm font-semibold text-gray-900'>{title}</h2>
            <p className='mt-0.5 text-xs text-gray-500'>The API key stays on the server and is never sent to the browser.</p>
          </div>
          <button type='button' onClick={onClose} className='flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'>
            <RiCloseLine className='h-4 w-4' />
          </button>
        </div>

        <div className='max-h-[65vh] overflow-y-auto px-6 py-5'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>Connection</p>
          <div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div>
              <label className={label} htmlFor='app-id'>Dify app id</label>
              <input
                id='app-id'
                className={`${input} disabled:bg-gray-50 disabled:text-gray-400`}
                value={form.id}
                disabled={lockId}
                onChange={e => set('id', e.target.value)}
                placeholder='ce2ae5f7-…'
              />
            </div>
            <div>
              <label className={label} htmlFor='app-slug'>URL slug</label>
              <input id='app-slug' className={input} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder='support' />
              <p className='mt-1 text-[11px] text-gray-400'>Served at /apps/{form.slug || '<slug>'}</p>
            </div>
            <div>
              <label className={label} htmlFor='app-key'>API key</label>
              <input
                id='app-key'
                type='password'
                className={input}
                value={form.apiKey}
                onChange={e => set('apiKey', e.target.value)}
                placeholder={lockId ? 'unchanged' : 'app-…'}
              />
            </div>
            <div>
              <label className={label} htmlFor='app-url'>API base URL</label>
              <input id='app-url' className={input} value={form.apiUrl} onChange={e => set('apiUrl', e.target.value)} placeholder={lockId ? 'unchanged' : 'https://api.dify.ai/v1'} />
            </div>
          </div>

          <p className='mt-6 text-[11px] font-medium uppercase tracking-wide text-gray-400'>Presentation</p>
          <div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div>
              <label className={label} htmlFor='app-name'>Display name</label>
              <input id='app-name' className={input} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor='app-description'>Description</label>
              <input id='app-description' className={input} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor='app-icon'>Icon</label>
              <input id='app-icon' className={input} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder='🤖 or /logo.png' />
            </div>
            <div>
              <label className={label} htmlFor='app-icon-bg'>Icon background</label>
              <input id='app-icon-bg' className={input} value={form.iconBackground} onChange={e => set('iconBackground', e.target.value)} placeholder='#CCFBF1' />
            </div>
            <div>
              <label className={label} htmlFor='app-language'>Default language</label>
              <input id='app-language' className={input} value={form.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value)} placeholder='en' />
            </div>
            <div>
              <label className={label} htmlFor='app-copyright'>Copyright</label>
              <input id='app-copyright' className={input} value={form.copyright} onChange={e => set('copyright', e.target.value)} />
            </div>
            <div className='sm:col-span-2'>
              <label className={label} htmlFor='app-privacy'>Privacy policy URL</label>
              <input id='app-privacy' className={input} value={form.privacyPolicy} onChange={e => set('privacyPolicy', e.target.value)} placeholder='https://…' />
            </div>
          </div>

          <p className='mt-6 text-[11px] font-medium uppercase tracking-wide text-gray-400'>AI generated notice</p>
          <div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='sm:col-span-2'>
              <label className='flex items-center gap-2 text-xs text-gray-600'>
                <input
                  type='checkbox'
                  className='h-3.5 w-3.5 rounded border-gray-300'
                  checked={form.aiNoticeEnabled}
                  onChange={e => set('aiNoticeEnabled', e.target.checked)}
                />
                Tell visitors that the answers are AI generated
              </label>
            </div>

            <div>
              <label className={label}>Position</label>
              <div className='mt-1 space-y-1.5'>
                {AI_NOTICE_POSITIONS.map(position => (
                  <label
                    key={position}
                    className={`flex items-center gap-2 text-xs ${form.aiNoticeEnabled ? 'text-gray-600' : 'text-gray-300'}`}
                  >
                    <input
                      type='radio'
                      name='ai-notice-position'
                      className='h-3.5 w-3.5 border-gray-300'
                      checked={form.aiNoticePosition === position}
                      disabled={!form.aiNoticeEnabled}
                      onChange={() => set('aiNoticePosition', position)}
                    />
                    {AI_NOTICE_POSITION_LABELS[position]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={label} htmlFor='app-ai-notice-text'>Custom text</label>
              <textarea
                id='app-ai-notice-text'
                rows={3}
                maxLength={AI_NOTICE_TEXT_MAX_LEN}
                className={`${input} resize-y disabled:bg-gray-50 disabled:text-gray-400`}
                value={form.aiNoticeText}
                disabled={!form.aiNoticeEnabled}
                placeholder='Leave empty to use the localised default'
                onChange={e => set('aiNoticeText', e.target.value)}
              />
              <p className='mt-1 flex items-center justify-between text-[11px] text-gray-400'>
                <span>Empty falls back to the built-in text for each language.</span>
                <span className='tabular-nums'>{Array.from(form.aiNoticeText).length}/{AI_NOTICE_TEXT_MAX_LEN}</span>
              </p>
            </div>
          </div>

          <div className='mt-5 flex flex-wrap items-center gap-6'>
            <label className='flex items-center gap-2 text-xs text-gray-600'>
              <input type='checkbox' className='h-3.5 w-3.5 rounded border-gray-300' checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
              Enabled — reachable at /apps/{form.slug || '<slug>'}
            </label>
            <label className='flex items-center gap-2 text-xs text-gray-600'>
              <input type='checkbox' className='h-3.5 w-3.5 rounded border-gray-300' checked={form.showPoweredBy} onChange={e => set('showPoweredBy', e.target.checked)} />
              Show &ldquo;Powered by Dify&rdquo;
            </label>
          </div>

          {
            error && <div className='mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600'>{error}</div>
          }
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4'>
          <button type='button' onClick={onClose} className='flex h-9 items-center rounded-lg px-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800'>
            Cancel
          </button>
          <button
            type='submit'
            disabled={busy || !form.id || !form.slug || !form.name || (!lockId && !form.apiKey.trim())}
            className='flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
          >
            <RiCheckLine className='h-4 w-4' />
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AppDialog
