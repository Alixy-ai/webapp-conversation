import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import cn from 'classnames'
import NodePanel from './node'
import type { WorkflowProcess } from '@/types/app'
import CheckCircle from '@/app/components/base/icons/solid/general/check-circle'
import AlertCircle from '@/app/components/base/icons/solid/alert-circle'
import Loading02 from '@/app/components/base/icons/line/loading-02'
import ChevronRight from '@/app/components/base/icons/line/chevron-right'
import { WorkflowRunningStatus } from '@/types/app'

interface WorkflowProcessProps {
  data: WorkflowProcess
  expand?: boolean
  hideInfo?: boolean
}
const WorkflowProcessItem = ({
  data,
  expand = false,
  hideInfo = false,
}: WorkflowProcessProps) => {
  const [collapse, setCollapse] = useState(!expand)
  const running = data.status === WorkflowRunningStatus.Running
  const succeeded = data.status === WorkflowRunningStatus.Succeeded
  const failed = data.status === WorkflowRunningStatus.Failed || data.status === WorkflowRunningStatus.Stopped

  const statusText = useMemo(() => {
    if (running) { return 'Running…' }
    if (succeeded) { return 'Completed' }
    if (failed) { return 'Failed' }
    return ''
  }, [running, succeeded, failed])

  const statusColor = useMemo(() => {
    if (running) { return 'text-gray-500' }
    if (succeeded) { return 'text-emerald-600' }
    if (failed) { return 'text-red-500' }
    return 'text-gray-500'
  }, [running, succeeded, failed])

  useEffect(() => {
    setCollapse(!expand)
  }, [expand])

  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-gray-200/90 bg-gray-25',
        hideInfo ? 'py-[7px]' : 'py-2',
      )}
    >
      <div
        className={cn(
          'flex items-center h-[18px] cursor-pointer select-none',
          hideInfo && 'px-2',
        )}
        onClick={() => setCollapse(!collapse)}
      >
        {
          running && (
            <Loading02 className='shrink-0 mr-1.5 w-3 h-3 text-gray-400 animate-spin' />
          )
        }
        {
          succeeded && (
            <CheckCircle className='shrink-0 mr-1.5 w-3 h-3 text-emerald-500' />
          )
        }
        {
          failed && (
            <AlertCircle className='shrink-0 mr-1.5 w-3 h-3 text-red-500' />
          )
        }
        <div className='grow text-xs font-medium text-gray-500 leading-[18px]'>Workflow Process</div>
        <span className={cn('shrink-0 mr-2 text-[11px] font-medium leading-[18px] hidden mobile:inline', statusColor)}>{statusText}</span>
        <ChevronRight className={`'ml-1 w-3 h-3 text-gray-400' ${collapse ? '' : 'rotate-90'}`} />
      </div>
      {
        !collapse && (
          <div className='mt-1.5'>
            {
              data.tracing.map(node => (
                <div key={node.id} className='mb-0.5 last-of-type:mb-0'>
                  <NodePanel
                    nodeInfo={node}
                    hideInfo={hideInfo}
                  />
                </div>
              ))
            }
          </div>
        )
      }
    </div>
  )
}

export default WorkflowProcessItem
