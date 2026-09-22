'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FC } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiArrowRightSLine } from '@remixicon/react'
import NodePanel from './node'
import type { WorkflowProcess } from '@/types/app'
import { WorkflowRunningStatus } from '@/types/app'

interface WorkflowProcessProps {
  data: WorkflowProcess
  expand?: boolean
  hideInfo?: boolean
  /** display mode from the app config: full / names / off */
  displayMode?: 'full' | 'names' | 'off'
  /** true once the answer text itself starts streaming; freezes the ticker */
  answerStarted?: boolean
}

const formatElapsed = (seconds: number) => {
  if (!seconds || seconds < 0.5) { return '' }
  if (seconds < 60) { return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s` }
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`
}

/**
 * Codex-style collapsible "thinking" panel:
 *  - full: borderless one-line header + indented step list, expandable;
 *  - names: a single line that scrolls the node names upward as they run
 *    (marquee-like ticker) and freezes the moment the answer starts
 *    streaming — the last state stays visible while the text flows in;
 *  - off:  only the quiet thinking/waiting header, nothing else.
 */
const WorkflowProcessItem: FC<WorkflowProcessProps> = ({
  data,
  expand = false,
  hideInfo = false,
  displayMode = 'full',
  answerStarted = false,
}) => {
  const { t } = useTranslation()
  const [collapse, setCollapse] = useState(!expand)
  const running = data.status === WorkflowRunningStatus.Running
  const succeeded = data.status === WorkflowRunningStatus.Succeeded
  const failed = data.status === WorkflowRunningStatus.Failed || data.status === WorkflowRunningStatus.Stopped

  const showDetail = displayMode === 'full'
  const isNames = displayMode === 'names'

  // While running the panel behaves like Codex's "Working…" block: open and
  // following along. Once the answer settles it becomes a quiet summary line.
  const autoExpand = running && showDetail
  const effectiveCollapse = autoExpand ? false : collapse

  useEffect(() => {
    if (running && showDetail) { setCollapse(false) }
  }, [running, showDetail])

  const elapsed = useMemo(() => {
    const runningNode = data.tracing.find(node => node.status === 'running')
    if (runningNode && runningNode.elapsed_time) { return formatElapsed(runningNode.elapsed_time) }
    const last = data.tracing[data.tracing.length - 1]
    if (!last) { return '' }
    const total = data.tracing.reduce((sum, node) => sum + (node.elapsed_time || 0), 0)
    return formatElapsed(total)
  }, [data.tracing])

  const headerText = running
    ? t('app.chat.workflow.thinking')
    : (succeeded ? t('app.chat.workflow.thoughtFor', { seconds: elapsed || '0s' }) : (failed ? t('app.chat.workflow.failed') : t('app.chat.workflow.thought')))

  const tokenCount = useMemo(() => {
    const tokens = data.tracing.reduce((sum, node) => sum + (node.execution_metadata?.total_tokens || 0), 0)
    return tokens > 0 ? tokens.toLocaleString() : ''
  }, [data.tracing])

  // ── names mode: the ticker ─────────────────────────────────────────────
  // The list of node titles is stacked vertically inside a one-line window
  // and translated upward in a loop while the workflow runs. It stops the
  // moment the answer text starts streaming (answerStarted), freezing on
  // the step that was current at that point.
  const stepTitles = useMemo(
    () => data.tracing.map(node => ({ id: node.id, title: node.title, status: node.status })),
    [data.tracing],
  )
  const [tickIndex, setTickIndex] = useState(0)
  const tickerFrozen = useRef(false)
  // freeze once the answer starts, never unfreeze afterwards for this message
  useEffect(() => {
    if (answerStarted) { tickerFrozen.current = true }
  }, [answerStarted])

  const activeIndex = useMemo(() => {
    const runningIdx = stepTitles.findIndex(step => step.status === 'running')
    return runningIdx >= 0 ? runningIdx : -1
  }, [stepTitles])

  useEffect(() => {
    if (!isNames || tickerFrozen.current) { return }
    if (activeIndex >= 0) {
      // follow the actually-running node
      setTickIndex(activeIndex)
      return
    }
    if (!running) { return }
    // no node running right now: cycle through the known steps
    if (stepTitles.length < 2) { return }
    const timer = setInterval(() => {
      setTickIndex(prev => (prev + 1) % stepTitles.length)
    }, 1600)
    return () => clearInterval(timer)
  }, [isNames, activeIndex, running, stepTitles.length])

  const tickerVisible = isNames && (running || stepTitles.length > 0) && !succeeded && !failed

  if (isNames) {
    const current = stepTitles[Math.min(tickIndex, Math.max(stepTitles.length - 1, 0))]
    const windowTitle = current?.title || t('app.chat.workflow.thinking')
    return (
      <div className={cn('mb-2 flex select-none items-center gap-2 overflow-hidden', hideInfo && 'mb-1.5')}>
        <span
          className={cn(
            'shrink-0 text-[13px] font-medium',
            running ? 'thinking-shimmer text-gray-500' : failed ? 'text-red-500' : 'text-gray-400',
          )}
        >
          {headerText}
        </span>
        {tickerVisible && (
          <span className='workflow-ticker-window relative block h-[20px] min-w-0 grow overflow-hidden'>
            <span
              className='workflow-ticker-track absolute left-0 top-0 flex flex-col items-start gap-0'
              style={{ transform: `translateY(-${tickIndex * 20}px)`, transition: 'transform 500ms cubic-bezier(0.25, 0.8, 0.35, 1)' }}
            >
              {stepTitles.map(step => (
                <span
                  key={step.id}
                  className='flex h-[20px] items-center gap-1.5 text-[12px] leading-5 text-gray-400'
                >
                  {step.status === 'running' && <RiArrowRightSLine className='h-3 w-3 shrink-0 text-gray-400' />}
                  <span className='max-w-[40vw] truncate'>{step.title}</span>
                  {step.status === 'succeeded' && <span className='shrink-0 text-[10px] leading-4 text-gray-300'>✓</span>}
                  {step.status === 'failed' && <span className='shrink-0 text-[10px] leading-4 text-red-400'>✕</span>}
                </span>
              ))}
            </span>
            {/* keep the row height honest while the track slides behind it */}
            <span className='invisible block truncate text-[12px] leading-5'>{windowTitle}</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('mb-2 select-none', hideInfo && 'mb-1.5')}>
      {/* One quiet line: chevron + shimmer/status text, no card, no borders */}
      <button
        type='button'
        aria-expanded={!effectiveCollapse}
        className={cn('group/wh flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-50', !showDetail && 'cursor-default')}
        onClick={() => { if (showDetail) { setCollapse(prev => !prev) } }}
      >
        <RiArrowRightSLine
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200',
            !effectiveCollapse && 'rotate-90',
            !showDetail && 'invisible',
          )}
        />
        <span
          className={cn(
            'grow truncate text-[13px] font-medium',
            running ? 'thinking-shimmer text-gray-500' : failed ? 'text-red-500' : 'text-gray-400',
          )}
        >
          {headerText}
        </span>
        {!running && tokenCount && (
          <span className='shrink-0 text-[11px] leading-4 text-gray-300 tabular-nums'>{tokenCount} tokens</span>
        )}
      </button>
      {
        !effectiveCollapse && showDetail && (
          <div className='mt-0.5 ml-1.5 border-l border-gray-100 pl-3'>
            {
              data.tracing.map(node => (
                <NodePanel
                  key={node.id}
                  nodeInfo={node}
                  hideInfo={hideInfo}
                />
              ))
            }
          </div>
        )
      }
    </div>
  )
}

export default WorkflowProcessItem
