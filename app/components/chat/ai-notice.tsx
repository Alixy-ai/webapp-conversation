'use client'
import type { FC } from 'react'
import React from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiSparkling2Line } from '@remixicon/react'
import { useApp } from '@/app/components/app-context'
import type { AiNoticePosition } from '@/config'

interface IAiNoticeProps {
  placement: AiNoticePosition
  className?: string
}

/**
 * "This content is AI generated" notice, configured per app in /admin.
 * Renders nothing at all when the feature is off or the configured
 * placement differs, so it never leaves empty space behind.
 */
const AiNotice: FC<IAiNoticeProps> = ({ placement, className }) => {
  const { t } = useTranslation()
  const { aiNoticeEnabled, aiNoticeText, aiNoticePosition } = useApp()

  if (!aiNoticeEnabled || aiNoticePosition !== placement) { return null }

  const text = (aiNoticeText || '').trim() || (t('app.chat.aiNotice.default') as string)
  if (!text) { return null }

  return (
    <p
      role='note'
      title={text}
      className={cn(
        'flex items-center gap-1 text-xs leading-5 text-gray-400 break-words',
        placement === 'input_hint' ? 'mt-1.5 justify-center px-1 line-clamp-2' : 'mt-1',
        className,
      )}
    >
      <RiSparkling2Line className='h-3.5 w-3.5 shrink-0' />
      <span className='min-w-0'>{text}</span>
    </p>
  )
}

export default React.memo(AiNotice)
