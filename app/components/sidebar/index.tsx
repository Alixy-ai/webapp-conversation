'use client'
import React from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from '@remixicon/react'
import type { ConversationItem } from '@/types/app'

const MAX_CONVERSATION_LENTH = 20

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onRename: (id: string, name: string) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  list,
  collapsed,
  onToggleCollapsed,
  onRename,
  onDelete,
}) => {
  const { t } = useTranslation()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const startRename = (e: React.MouseEvent, item: ConversationItem) => {
    e.stopPropagation()
    setEditingId(item.id)
    setEditName(item.name || '')
    setConfirmDeleteId(null)
  }

  const commitRename = async () => {
    if (busy || !editingId) { return }
    const name = editName.trim()
    if (!name) { setEditingId(null); return }
    const id = editingId
    setBusy(true)
    try {
      await onRename(id, name)
      setEditingId(null)
    }
    finally { setBusy(false) }
  }

  const requestDelete = (e: React.MouseEvent, item: ConversationItem) => {
    e.stopPropagation()
    setConfirmDeleteId(item.id)
    setEditingId(null)
  }

  const commitDelete = async () => {
    if (busy || !confirmDeleteId) { return }
    const id = confirmDeleteId
    setBusy(true)
    try {
      await onDelete(id)
      setConfirmDeleteId(null)
    }
    finally { setBusy(false) }
  }

  const renderRowActions = (item: ConversationItem) => (
    <span
      className='absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/conv:flex items-center gap-0.5'
      onClick={e => e.stopPropagation()}
    >
      <button
        type='button'
        title={t('app.chat.renameConversation')}
        onClick={e => startRename(e, item)}
        className='flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer'
      >
        <PencilSquareIcon className='w-3.5 h-3.5' />
      </button>
      <button
        type='button'
        title={t('app.chat.deleteConversation')}
        onClick={e => requestDelete(e, item)}
        className='flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer'
      >
        <TrashIcon className='w-3.5 h-3.5' />
      </button>
    </span>
  )

  /* ── collapsed rail ─────────────────────────────────────────── */
  if (collapsed) {
    return (
      <aside className="shrink-0 flex flex-col items-center w-[52px] gap-1 py-3 bg-gray-50 border-r border-gray-200/80">
        <button
          type='button'
          onClick={onToggleCollapsed}
          title={t('app.chat.expandSidebar')}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer'
        >
          <RiSidebarUnfoldLine className='w-[18px] h-[18px]' />
        </button>
        <div className='my-1 w-6 border-t border-gray-200' />
        <button
          type='button'
          onClick={() => { onCurrentIdChange('-1') }}
          title={t('app.chat.newChat')}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer'
        >
          <PencilSquareIcon className="w-[18px] h-[18px]" />
        </button>
        <nav className='flex-1 flex flex-col items-center gap-0.5 overflow-y-auto py-1 w-full'>
          {list.slice(0, MAX_CONVERSATION_LENTH).map((item) => {
            const isCurrent = item.id === currentId
            return (
              <div
                key={item.id}
                onClick={() => onCurrentIdChange(item.id)}
                title={item.name}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg text-sm cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                {isCurrent && (
                  <span className='absolute -left-[7px] top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary-500' />
                )}
                <span className='truncate'>{item.name?.[0] ?? '·'}</span>
              </div>
            )
          })}
        </nav>
        <div className="text-[9px] leading-3 text-gray-300 select-none">©{(new Date()).getFullYear()}</div>
      </aside>
    )
  }

  /* ── expanded sidebar ───────────────────────────────────────── */
  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto bg-gray-50 pc:w-[232px] tablet:w-[200px] mobile:w-[260px] h-full border-r border-gray-200/80"
    >
      <div className="flex flex-shrink-0 items-center justify-between px-3 pt-3">
        <button
          type='button'
          onClick={() => { onCurrentIdChange('-1') }}
          className="group flex w-[calc(100%-32px)] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 h-9 text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <PencilSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          <span className='truncate'>{t('app.chat.newChat')}</span>
        </button>
        <button
          type='button'
          onClick={onToggleCollapsed}
          title={t('app.chat.collapseSidebar')}
          className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <RiSidebarFoldLine className='w-[18px] h-[18px]' />
        </button>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 space-y-0.5">
        {list.map((item) => {
          const isCurrent = item.id === currentId
          const isEditing = editingId === item.id
          const isConfirming = confirmDeleteId === item.id
          return (
            <div
              onClick={() => { if (!isEditing && !isConfirming) { onCurrentIdChange(item.id) } }}
              key={item.id}
              className={`group/conv relative flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              } ${isEditing || isConfirming ? 'bg-white shadow-sm' : ''}`}
            >
              {isCurrent && !isEditing && !isConfirming && (
                <span className='absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary-500' />
              )}
              {isEditing
                ? (
                  <div className='flex items-center gap-1 w-full'>
                    <input
                      autoFocus
                      value={editName}
                      disabled={busy}
                      maxLength={60}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                      }}
                      className='w-full min-w-0 rounded-md border border-primary-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15'
                    />
                    <button
                      type='button'
                      disabled={busy || !editName.trim()}
                      onClick={commitRename}
                      title={t('common.operation.save')}
                      className='flex shrink-0 items-center justify-center w-6 h-6 rounded-md text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-40'
                    >
                      <CheckIcon className='w-3.5 h-3.5' />
                    </button>
                    <button
                      type='button'
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      title={t('common.operation.cancel')}
                      className='flex shrink-0 items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer'
                    >
                      <XMarkIcon className='w-3.5 h-3.5' />
                    </button>
                  </div>
                )
                : isConfirming
                  ? (
                    <div className='flex items-center gap-2 w-full'>
                      <span className='truncate text-xs text-gray-500'>{t('app.chat.deleteConfirmLabel')}</span>
                      <span className='ml-auto flex shrink-0 items-center gap-1'>
                        <button
                          type='button'
                          disabled={busy}
                          onClick={commitDelete}
                          className='h-6 rounded-md bg-red-600 px-2 text-[11px] font-medium text-white hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50'
                        >
                          {t('app.chat.deleteConfirmYes')}
                        </button>
                        <button
                          type='button'
                          disabled={busy}
                          onClick={() => setConfirmDeleteId(null)}
                          className='h-6 rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer'
                        >
                          {t('app.chat.deleteConfirmNo')}
                        </button>
                      </span>
                    </div>
                  )
                  : (
                    <>
                      <span className='truncate pr-14'>{item.name}</span>
                      {renderRowActions(item)}
                    </>
                  )}
            </div>
          )
        })}
      </nav>
      <div className="flex flex-shrink-0 px-4 pb-4">
        <div className="text-gray-400 font-normal text-xs">© {copyRight} {(new Date()).getFullYear()}</div>
      </div>
    </aside>
  )
}

export default React.memo(Sidebar)
