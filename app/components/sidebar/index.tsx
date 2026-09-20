import React from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
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
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  list,
  collapsed,
  onToggleCollapsed,
}) => {
  const { t } = useTranslation()

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
          className='flex items-center justify-center shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer'
        >
          <RiSidebarFoldLine className='w-[18px] h-[18px]' />
        </button>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 space-y-0.5">
        {list.map((item) => {
          const isCurrent = item.id === currentId
          return (
            <div
              onClick={() => onCurrentIdChange(item.id)}
              key={item.id}
              className={`relative flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {isCurrent && (
                <span className='absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary-500' />
              )}
              <span className='truncate'>{item.name}</span>
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
