'use client'
import type { FC } from 'react'
import React from 'react'
import { RiFileTextLine } from '@remixicon/react'
import type { IChatItem } from '../type'
import type { VisionFile } from '@/types/app'
import AppIcon from '@/app/components/base/app-icon'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  files?: VisionFile[]
}

// A locally picked file only carries a `base64_url` until the user reloads the
// conversation, after which Dify returns a (proxied) `url`.
const getPreviewSrc = (file: VisionFile) => file.url || file.base64_url || ''

const Question: FC<IQuestionProps> = ({ id, content, useCurrentUserAvatar, files = [] }) => {
  const userName = ''
  const imageSrcs = files
    .filter(file => file.type === 'image')
    .map(getPreviewSrc)
    .filter(src => !!src)
  const otherFiles = files.filter(file => file.type !== 'image')

  return (
    <div className='flex gap-3 items-start justify-end' key={id}>
      <div className='flex flex-col items-end max-w-[85%]'>
        <div className='px-4 py-2.5 bg-primary-600 text-white text-sm rounded-2xl rounded-br-md shadow-sm'>
          {imageSrcs.length > 0 && (
            <ImageGallery srcs={imageSrcs} />
          )}
          {otherFiles.length > 0 && (
            <div className='mb-2 flex flex-wrap gap-2'>
              {otherFiles.map((file, index) => (
                <div
                  key={`${file.upload_file_id || file.name || index}`}
                  className='flex max-w-[220px] items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5'
                >
                  <RiFileTextLine className='h-3.5 w-3.5 shrink-0' />
                  <span className='truncate text-xs'>{file.name || file.type}</span>
                </div>
              ))}
            </div>
          )}
          <StreamdownMarkdown content={content} />
        </div>
      </div>
      <div className='shrink-0 w-8 h-8'>
        {useCurrentUserAvatar
          ? (
            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-medium'>
              {userName?.[0]?.toLocaleUpperCase()}
            </div>
          )
          : <AppIcon size='small' rounded icon='🙂' background='#F2F4F7' />}
      </div>
    </div>
  )
}

export default React.memo(Question)
