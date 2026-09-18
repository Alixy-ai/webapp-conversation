import { useCallback } from 'react'
import {
  RiLink,
  RiUploadCloud2Line,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { useFile } from './hooks'
import type { FileEntity, FileUpload } from './types'
import FileFromLinkOrLocal from './file-from-link-or-local'
import {
  FileContextProvider,
  useStore,
} from './store'
import FileInput from './file-input'
import FileItem from './file-item'
import Button from '@/app/components/base/button'
import Tooltip from '@/app/components/base/tooltip'
import cn from '@/utils/classnames'
import { TransferMethod } from '@/types/app'

interface Option {
  value: string
  label: string
  icon: JSX.Element
}

export type FileUploaderVariant = 'default' | 'compact'

interface FileUploaderTriggerProps {
  fileConfig: FileUpload
  /**
   * `compact` renders icon-only buttons, meant to be used inline in a toolbar.
   */
  variant?: FileUploaderVariant
}

const FileUploaderTrigger = ({
  fileConfig,
  variant = 'default',
}: FileUploaderTriggerProps) => {
  const { t } = useTranslation()
  const files = useStore(s => s.files)
  const disabled = !!(fileConfig.number_limits && files.length >= fileConfig.number_limits)
  const options: Option[] = [
    {
      value: TransferMethod.local_file,
      label: t('common.fileUploader.uploadFromComputer'),
      icon: <RiUploadCloud2Line className='h-4 w-4' />,
    },
    {
      value: TransferMethod.remote_url,
      label: t('common.fileUploader.pasteFileLink'),
      icon: <RiLink className='h-4 w-4' />,
    },
  ]

  const renderButton = useCallback((option: Option, open?: boolean) => {
    return (
      <Button
        key={option.value}
        // variant='tertiary'
        className={cn('relative grow', open && 'bg-components-button-tertiary-bg-hover')}
        disabled={disabled}
      >
        {option.icon}
        <span className='ml-1'>{option.label}</span>
        {
          option.value === TransferMethod.local_file && (
            <FileInput fileConfig={fileConfig} />
          )
        }
      </Button>
    )
  }, [disabled, fileConfig])

  const renderIconButton = useCallback((option: Option) => {
    return (
      <Tooltip
        key={option.value}
        selector={`file-uploader-${option.value}`}
        content={option.label}
      >
        <div
          className={cn(
            'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors',
            disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-gray-100 hover:text-gray-700',
          )}
        >
          {option.icon}
          {
            option.value === TransferMethod.local_file && (
              <FileInput fileConfig={fileConfig} />
            )
          }
        </div>
      </Tooltip>
    )
  }, [disabled, fileConfig])

  const renderOption = useCallback((option: Option) => {
    const trigger = (open?: boolean) => (variant === 'compact' ? renderIconButton(option) : renderButton(option, open))

    if (option.value === TransferMethod.local_file && fileConfig?.allowed_file_upload_methods?.includes(TransferMethod.local_file)) { return trigger() }

    if (option.value === TransferMethod.remote_url && fileConfig?.allowed_file_upload_methods?.includes(TransferMethod.remote_url)) {
      return (
        <FileFromLinkOrLocal
          key={option.value}
          showFromLocal={false}
          trigger={trigger}
          fileConfig={fileConfig}
        />
      )
    }
  }, [fileConfig, renderButton, renderIconButton, variant])

  return (
    <div className={cn('flex items-center', variant === 'compact' ? 'space-x-0.5' : 'space-x-1')}>
      {options.map(renderOption)}
    </div>
  )
}

interface FileUploaderFileListProps {
  fileConfig: FileUpload
}

const FileUploaderFileList = ({
  fileConfig,
}: FileUploaderFileListProps) => {
  const files = useStore(s => s.files)
  const {
    handleRemoveFile,
    handleReUploadFile,
  } = useFile(fileConfig)

  if (!files.length) { return null }

  return (
    <div className='space-y-1'>
      {
        files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            showDeleteAction
            showDownloadAction={false}
            onRemove={() => handleRemoveFile(file.id)}
            onReUpload={() => handleReUploadFile(file.id)}
          />
        ))
      }
    </div>
  )
}

interface FileUploaderAttachmentProps {
  value?: FileEntity[]
  onChange: (files: FileEntity[]) => void
  children: React.ReactNode
}

/**
 * Provides the file store so that a custom layout can place the trigger and the
 * file list anywhere inside `children`.
 */
export const FileUploaderAttachment = ({
  value,
  onChange,
  children,
}: FileUploaderAttachmentProps) => {
  return (
    <FileContextProvider
      value={value}
      onChange={onChange}
    >
      {children}
    </FileContextProvider>
  )
}

const FileUploaderInAttachment = ({
  fileConfig,
}: {
  fileConfig: FileUpload
}) => {
  return (
    <>
      <FileUploaderTrigger fileConfig={fileConfig} />
      <div className='mt-1'>
        <FileUploaderFileList fileConfig={fileConfig} />
      </div>
    </>
  )
}

interface FileUploaderInAttachmentWrapperProps {
  value?: FileEntity[]
  onChange: (files: FileEntity[]) => void
  fileConfig: FileUpload
}
const FileUploaderInAttachmentWrapper = ({
  value,
  onChange,
  fileConfig,
}: FileUploaderInAttachmentWrapperProps) => {
  return (
    <FileUploaderAttachment
      value={value}
      onChange={onChange}
    >
      <FileUploaderInAttachment fileConfig={fileConfig} />
    </FileUploaderAttachment>
  )
}

export { FileUploaderFileList, FileUploaderTrigger }
export default FileUploaderInAttachmentWrapper
