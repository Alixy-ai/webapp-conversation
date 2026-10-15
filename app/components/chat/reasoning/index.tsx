'use client'

import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiArrowRightSLine } from '@remixicon/react'
import type { ReasoningStep } from '@/types/app'

interface ReasoningProps {
  steps: ReasoningStep[]
  /** the workflow is still running: keep it open and shimmer the header */
  running?: boolean
  failed?: boolean
  /** elapsed label for the settled header, e.g. "4s" */
  elapsed?: string
}

/**
 * Codex-style "reasoning only" view: a quiet collapsible header over the
 * model's thinking text (no node steps, no tool I/O). Auto-expands while the
 * model is still reasoning, collapses to a one-line summary once it settles.
 */
const Reasoning: FC<ReasoningProps> = ({ steps, running = false, failed = false, elapsed = '' }) => {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // while running: follow along, open; once done: fold into a summary line
  const [userToggled, setUserToggled] = useState(false)
  useEffect(() => {
    if (!userToggled) { setCollapsed(!running && steps.length > 0) }
  }, [running, steps.length, userToggled])

  // keep the newest reasoning in view while it streams
  useEffect(() => {
    if (running && !collapsed && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [steps, running, collapsed])

  const text = useMemo(() => steps.map(step => step.text).filter(Boolean).join('\n\n'), [steps])

  const headerText = running
    ? t('app.chat.workflow.thinking')
    : failed
      ? t('app.chat.workflow.failed')
      : elapsed
        ? t('app.chat.workflow.thoughtFor', { seconds: elapsed })
        : t('app.chat.workflow.thought')

  if (!running && !text) { return null }

  return (
    <div className='mb-2 select-none'>
      <button
        type='button'
        aria-expanded={!collapsed}
        className='group/rh flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-50'
        onClick={() => { setUserToggled(true); setCollapsed(prev => !prev) }}
      >
        <RiArrowRightSLine
          className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200', !collapsed && 'rotate-90')}
        />
        <span
          className={cn(
            'grow truncate text-[13px] font-medium',
            running ? 'thinking-shimmer text-gray-500' : failed ? 'text-red-500' : 'text-gray-400',
          )}
        >
          {headerText}
        </span>
      </button>
      {!collapsed && (
        <div
          ref={bodyRef}
          className='mt-0.5 ml-1.5 max-h-72 overflow-y-auto border-l border-gray-100 pl-3'
        >
          {text
            ? (
              <div className='whitespace-pre-wrap break-words py-0.5 text-[12.5px] leading-5 text-gray-400'>
                {text}
              </div>
            )
            : (
              <div className='py-0.5 text-[12.5px] italic leading-5 text-gray-300'>
                {t('app.chat.workflow.thinking')}
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default React.memo(Reasoning)
