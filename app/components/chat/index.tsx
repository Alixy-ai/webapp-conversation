'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { RiSendPlane2Fill } from '@remixicon/react'
import Textarea from 'rc-textarea'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import { FileUploaderAttachment, FileUploaderFileList, FileUploaderTrigger } from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'

export interface IChatProps {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileConfig?: FileUpload
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileConfig,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])

  const handleSend = () => {
    if (!valid() || (checkCanSend && !checkCanSend())) { return }
    const hasPendingImageUploads = files.some(file => file.progress !== -1 && file.progress < 100)
    const hasPendingAttachmentUploads = attachmentFiles.some(file => file.progress !== -1 && file.progress < 100)
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
      // client-only fields, used to render the attachment inside the message bubble
      base64_url: fileItem.base64Url,
      name: fileItem.file?.name,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    onSend(queryRef.current, combinedFiles)
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length) { onClear() }
      if (!isResponding) {
        setQuery('')
        queryRef.current = ''
      }
    }
    if (!attachmentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) { setAttachmentFiles([]) }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  const canSubmit = query.trim().length > 0
  const hasAttachments = (!!visionConfig?.enabled && files.length > 0) || (!!fileConfig?.enabled && attachmentFiles.length > 0)

  return (
    <div className={cn('h-full flex flex-col')}>
      {/* Chat List */}
      <div className="flex-1 space-y-6">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              suggestionClick={suggestionClick}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              files={item.message_files}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <FileUploaderAttachment
            value={attachmentFiles}
            onChange={setAttachmentFiles}
          >
            <div className='sticky bottom-0 z-10 mt-4 pb-3 bg-gradient-to-t from-white via-white to-transparent'>
              <div className='rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow-md'>
                {/* attachments */}
                {
                  hasAttachments && (
                    <div className='space-y-1.5 px-2 pt-2'>
                      {
                        !!visionConfig?.enabled && files.length > 0 && (
                          <ImageList
                            list={files}
                            onRemove={onRemove}
                            onReUpload={onReUpload}
                            onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                            onImageLinkLoadError={onImageLinkLoadError}
                          />
                        )
                      }
                      {
                        !!fileConfig?.enabled && (
                          <FileUploaderFileList fileConfig={fileConfig} />
                        )
                      }
                    </div>
                  )
                }
                <div className='max-h-[150px] overflow-y-auto'>
                  <Textarea
                    className='block w-full resize-none appearance-none bg-transparent px-3 py-2.5 text-base leading-6 text-gray-700 outline-none max-h-none placeholder:text-gray-400'
                    value={query}
                    onChange={handleContentChange}
                    onKeyUp={handleKeyUp}
                    onKeyDown={handleKeyDown}
                    placeholder={t('app.chat.inputPlaceholder') || ''}
                    autoSize
                  />
                </div>
                {/* toolbar */}
                <div className='flex items-center justify-between gap-2 px-2 pb-2'>
                  <div className='flex items-center gap-0.5'>
                    {
                      !!visionConfig?.enabled && (
                        <ChatImageUploader
                          settings={visionConfig}
                          onUpload={onUpload}
                          disabled={files.length >= visionConfig.number_limits}
                        />
                      )
                    }
                    {
                      !!fileConfig?.enabled && (
                        <FileUploaderTrigger
                          fileConfig={fileConfig}
                          variant='compact'
                        />
                      )
                    }
                  </div>
                  <div className='flex items-center gap-2'>
                    {
                      canSubmit && (
                        <span className='select-none text-xs tabular-nums text-gray-400'>{query.trim().length}</span>
                      )
                    }
                    <Tooltip
                      selector='send-tip'
                      htmlContent={
                        <div>
                          <div>{t('common.operation.send')} Enter</div>
                          <div>{t('common.operation.lineBreak')} Shift Enter</div>
                        </div>
                      }
                    >
                      <button
                        type='button'
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                          canSubmit
                            ? 'cursor-pointer bg-primary-600 text-white hover:bg-primary-700'
                            : 'cursor-default bg-gray-100 text-gray-400',
                        )}
                        onClick={handleSend}
                      >
                        <RiSendPlane2Fill className='h-4 w-4' />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </FileUploaderAttachment>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
