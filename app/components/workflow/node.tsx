'use client'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import cn from 'classnames'
import { RiErrorWarningLine, RiLoader2Line } from '@remixicon/react'
import type { NodeTracing } from '@/types/app'

interface Props {
  nodeInfo: NodeTracing
  hideInfo?: boolean
}

const formatElapsed = (seconds: number) => {
  if (seconds < 1) { return `${(seconds * 1000).toFixed(0)}ms` }
  if (seconds < 60) { return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s` }
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`
}

/**
 * One streaming step of the thinking trace — a plain indented line like
 * Codex's reasoning steps, not a boxed console row: tiny leading dot that
 * pulses while the node runs, quiet title, right-aligned duration.
 */
const NodePanel: FC<Props> = ({ nodeInfo }) => {
  const [expand, setExpand] = useState(false)

  useEffect(() => {
    setExpand(!!nodeInfo.expand)
  }, [nodeInfo.expand])

  const running = nodeInfo.status === 'running'
  const failed = nodeInfo.status === 'failed'
  const stopped = nodeInfo.status === 'stopped'

  return (
    <div
      className='group/n relative flex items-start gap-2 rounded-md px-1 py-[3px] transition-colors hover:bg-gray-50'
      onClick={() => setExpand(prev => !prev)}
    >
      {/* status dot: spinner while running, solid when done, hollow on error */}
      <span className='mt-[7px] shrink-0 leading-none'>
        {running
          ? <RiLoader2Line className='h-3 w-3 animate-spin text-gray-400' />
          : failed || stopped
            ? <RiErrorWarningLine className={cn('h-3 w-3', failed ? 'text-red-400' : 'text-amber-400')} />
            : <span className='block h-[5px] w-[5px] rounded-full bg-gray-300' />}
      </span>
      <div className='grow min-w-0'>
        <div className='flex items-baseline gap-2'>
          <span
            className={cn(
              'grow truncate text-[13px] leading-5',
              running ? 'text-gray-600' : failed || stopped ? 'text-gray-500' : 'text-gray-400',
            )}
            title={nodeInfo.title}
          >
            {nodeInfo.title}
          </span>
          {nodeInfo.status !== 'running' && (
            <span className='shrink-0 text-[11px] leading-4 text-gray-300 tabular-nums'>{formatElapsed(nodeInfo.elapsed_time || 0)}</span>
          )}
        </div>
        {expand && (nodeInfo.error || nodeInfo.outputs != null) && (
          <div className='mt-0.5 mb-1 max-h-48 overflow-y-auto rounded-md bg-gray-50 px-2 py-1.5 text-[11px] leading-4 text-gray-500'>
            {nodeInfo.error
              ? <span className='whitespace-pre-wrap break-words text-red-500'>{nodeInfo.error}</span>
              : <pre className='whitespace-pre-wrap break-words font-mono'>{JSON.stringify(nodeInfo.outputs, null, 2)}</pre>}
          </div>
        )}
      </div>
    </div>
  )
}

export default NodePanel
