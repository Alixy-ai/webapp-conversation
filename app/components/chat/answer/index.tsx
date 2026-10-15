'use client'
import type { FC } from 'react'
import type { FeedbackFunc } from '../type'
import type { ChatItem, MessageRating, VisionFile } from '@/types/app'
import type { Emoji } from '@/types/tools'
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Tooltip from '@/app/components/base/tooltip'
import WorkflowProcess from '@/app/components/workflow/workflow-process'
import Reasoning from '../reasoning'
import { randomString } from '@/utils/string'
import ImageGallery from '../../base/image-gallery'
import AppIcon from '@/app/components/base/app-icon'
import { useApp } from '@/app/components/app-context'
import AiNotice from '../ai-notice'
import Citation from '../citation'
import { useCitations } from '../citation/use-citations'
import { makeCitationComponents } from '../citation/badge'
import { renderMarkers } from '@/utils/citation'
import LoadingAnim from '../loading-anim'
import Thought from '../thought'

function OperationBtn({ innerContent, onClick, className }: { innerContent: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <div
      className={`relative box-border flex items-center justify-center h-7 w-7 p-0.5 rounded-lg cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${className ?? ''}`}
      onClick={onClick && onClick}
    >
      {innerContent}
    </div>
  )
}

const RatingIcon: FC<{ isLike: boolean }> = ({ isLike }) => {
  return isLike ? <HandThumbUpIcon className="w-4 h-4" /> : <HandThumbDownIcon className="w-4 h-4" />
}

const IconWrapper: FC<{ children: React.ReactNode | string }> = ({ children }) => {
  return (
    <div className="rounded-lg h-6 w-6 flex items-center justify-center hover:bg-gray-100">
      {children}
    </div>
  )
}

interface IAnswerProps {
  item: ChatItem
  feedbackDisabled: boolean
  onFeedback?: FeedbackFunc
  isResponding?: boolean
  allToolIcons?: Record<string, string | Emoji>
  suggestionClick?: (suggestion: string) => void
}

// The component needs to maintain its own state to control whether to display input component
const Answer: FC<IAnswerProps> = ({
  item,
  feedbackDisabled = false,
  onFeedback,
  isResponding,
  allToolIcons,
  suggestionClick = () => { },
}) => {
  const { id, content, feedback, agent_thoughts, workflowProcess, suggestedQuestions = [] } = item
  const isAgentMode = !!agent_thoughts && agent_thoughts.length > 0

  const { t } = useTranslation()
  const { slug, icon, iconBackground, workflowDisplayMode, citationEnabled } = useApp()
  // markers are always stripped from the visible text; resolving them is per-app
  const citations = useCitations(slug, content, citationEnabled && !isResponding)
  const displayContent = renderMarkers(content, citations.numbers, !!isResponding)
  // inline badges at sentence end; clicking one opens it in the footer
  const [citeFocus, setCiteFocus] = React.useState<{ n: number, t: number } | null>(null)
  const citationComponents = React.useMemo(
    () => makeCitationComponents(citations.items, n => setCiteFocus({ n, t: Date.now() })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [citations.items.map(i => i.segment_id).join(',')],
  )
  // total node time, shown as "Thought for 12s" once the reasoning settles;
  // prefer the workflow-level total (authoritative) over the node sum
  const reasoningElapsed = React.useMemo(() => {
    const format = (total: number) => {
      if (!total || total < 0.5) { return '' }
      if (total < 60) { return `${total.toFixed(total < 10 ? 1 : 0)}s` }
      const minutes = Math.floor(total / 60)
      return `${minutes}m ${Math.round(total - minutes * 60)}s`
    }
    if (typeof workflowProcess?.elapsedTime === 'number' && workflowProcess.elapsedTime > 0) {
      return format(workflowProcess.elapsedTime)
    }
    const total = (workflowProcess?.tracing || []).reduce((sum, node) => sum + (node.elapsed_time || 0), 0)
    return format(total)
  }, [workflowProcess?.tracing, workflowProcess?.elapsedTime])

  /**
   * Render feedback results (distinguish between users and administrators)
   * User reviews cannot be cancelled in Console
   * @param rating feedback result
   * @param isUserFeedback Whether it is user's feedback
   * @returns comp
   */
  const renderFeedbackRating = (rating: MessageRating | undefined) => {
    if (!rating) { return null }

    const isLike = rating === 'like'
    const ratingIconClassname = isLike ? 'text-primary-600 bg-primary-100 hover:bg-primary-200' : 'text-red-600 bg-red-100 hover:bg-red-200'
    // The tooltip is always displayed, but the content is different for different scenarios.
    return (
      <Tooltip
        selector={`user-feedback-${randomString(16)}`}
        content={isLike ? '取消赞同' : '取消反对'}
      >
        <div
          className="relative box-border flex items-center justify-center h-7 w-7 p-0.5 rounded-lg cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          onClick={async () => {
            await onFeedback?.(id, { rating: null })
          }}
        >
          <div className={`${ratingIconClassname} rounded-lg h-6 w-6 flex items-center justify-center`}>
            <RatingIcon isLike={isLike} />
          </div>
        </div>
      </Tooltip>
    )
  }

  /**
   * Different scenarios have different operation items.
   * @returns comp
   */
  const renderItemOperation = () => {
    const userOperation = () => {
      return feedback?.rating
        ? null
        : (
          <div className="flex gap-1">
            <Tooltip selector={`user-feedback-${randomString(16)}`} content={t('common.operation.like') as string}>
              {OperationBtn({ innerContent: <IconWrapper><RatingIcon isLike={true} /></IconWrapper>, onClick: () => onFeedback?.(id, { rating: 'like' }) })}
            </Tooltip>
            <Tooltip selector={`user-feedback-${randomString(16)}`} content={t('common.operation.dislike') as string}>
              {OperationBtn({ innerContent: <IconWrapper><RatingIcon isLike={false} /></IconWrapper>, onClick: () => onFeedback?.(id, { rating: 'dislike' }) })}
            </Tooltip>
          </div>
        )
    }

    return (
      <div className='flex gap-1'>
        {userOperation()}
      </div>
    )
  }

  const getImgs = (list?: VisionFile[]) => {
    if (!list) { return [] }
    return list.filter(file => file.type === 'image' && file.belongs_to === 'assistant')
  }

  const agentModeAnswer = (
    <div>
      {agent_thoughts?.map((item, index) => (
        <div key={index}>
          {item.thought && (
            <StreamdownMarkdown content={renderMarkers(item.thought, citations.numbers, !!isResponding)} components={citationComponents} />
          )}
          {/* {item.tool} */}
          {/* perhaps not use tool */}
          {!!item.tool && (
            <Thought
              thought={item}
              allToolIcons={allToolIcons || {}}
              isFinished={!!item.observation || !isResponding}
            />
          )}

          {getImgs(item.message_files).length > 0 && (
            <ImageGallery srcs={getImgs(item.message_files).map(item => item.url)} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div key={id} className='group/answer msg-rise'>
      <div className='flex items-start gap-3'>
        <div className='shrink-0 w-8 h-8'>
          {isResponding
            ? (
              <div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary-600 border border-primary-100'>
                <LoadingAnim type='avatar' />
              </div>
            )
            : <AppIcon size='small' rounded icon={icon || '✦'} background={iconBackground || '#CCFBF1'} />}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='relative text-sm text-gray-800 max-w-full'>
            {workflowProcess && (
              workflowDisplayMode === 'reasoning'
                ? (
                  <Reasoning
                    steps={workflowProcess.reasoning || []}
                    running={!!isResponding}
                    failed={workflowProcess.status === 'failed' || workflowProcess.status === 'stopped'}
                    elapsed={reasoningElapsed}
                  />
                )
                : (
                  <WorkflowProcess
                    data={workflowProcess}
                    hideInfo
                    displayMode={workflowDisplayMode}
                    answerStarted={isResponding && !!content}
                  />
                )
            )}
            {(isResponding && (isAgentMode ? (!content && (agent_thoughts || []).filter(item => !!item.thought || !!item.tool).length === 0) : !content))
              ? (
                <div className='flex items-center justify-center w-6 h-5'>
                  <LoadingAnim type='text' />
                </div>
              )
              : (isAgentMode
                ? agentModeAnswer
                : (
                  <StreamdownMarkdown content={displayContent} components={citationComponents} />
                ))}
            {citationEnabled && !isResponding && <Citation items={citations.items} focus={citeFocus} />}
            {suggestedQuestions.length > 0 && (
              <div className='mt-3 pt-3 border-t border-gray-100'>
                <div className='flex gap-2 mt-1 flex-wrap'>
                  {suggestedQuestions.map((suggestion, index) => (
                    <div key={index}>
                      <Button className='text-sm' type='link' onClick={() => suggestionClick(suggestion)}>{suggestion}</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className='mt-1 flex flex-row justify-start gap-1 h-7 opacity-0 group-hover/answer:opacity-100 transition-opacity'>
              {!feedbackDisabled && !item.feedbackDisabled && renderItemOperation()}
              {/* User feedback must be displayed */}
              {!feedbackDisabled && renderFeedbackRating(feedback?.rating)}
            </div>
            {/* AI generated notice, only after the answer has settled */}
            {!isResponding && !item.isError && <AiNotice placement='answer_footer' />}
          </div>
        </div>
      </div>
    </div>
  )
}
export default React.memo(Answer)
