'use client'
import type { FC } from 'react'
import React from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import {
  PencilIcon,
} from '@heroicons/react/24/outline'
import type { AppInfo } from '@/types/app'
import AppIcon from '@/app/components/base/app-icon'
import { useApp } from '@/app/components/app-context'

export const AppInfoComp: FC<{ siteInfo: AppInfo }> = ({ siteInfo }) => {
  const { t } = useTranslation()
  const { icon, iconBackground } = useApp()
  return (
    <div className='text-center'>
      <div className='flex justify-center'>
        <AppIcon size='large' icon={icon || '✦'} background={iconBackground || '#99F6E4'} className='!text-2xl' />
      </div>
      <h1 className='mt-4 text-2xl font-semibold tracking-tight text-gray-900'>
        {t('app.common.welcome')} {siteInfo.title}
      </h1>
      <p className='mt-2 text-sm text-gray-500 max-w-md mx-auto'>{siteInfo.description}</p>
    </div>
  )
}

export const PromptTemplate: FC<{ html: string }> = ({ html }) => {
  return (
    <div
      className={'box-border text-sm text-gray-600'}
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  )
}

export const ChatBtn: FC<{ onClick: () => void, className?: string }> = ({
  className,
  onClick,
}) => {
  const { t } = useTranslation()
  return (
    <button
      type='button'
      className={cn(
        'group inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium',
        'bg-gray-900 text-white hover:bg-gray-700 cursor-pointer transition-colors',
        className,
      )}
      onClick={onClick}
    >
      {t('app.chat.startChat')}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform group-hover:translate-x-0.5">
        <path fillRule="evenodd" clipRule="evenodd" d="M1.875 7C1.875 6.79289 2.04289 6.625 2.25 6.625H10.0303L7.17249 3.76723C7.02604 3.62078 7.02604 3.38221 7.17249 3.23576C7.31894 3.08931 7.55751 3.08931 7.70396 3.23576L11.2039 6.73573C11.2391 6.77093 11.2653 6.81144 11.2824 6.85491C11.2994 6.89877 11.3082 6.94543 11.3087 6.99359C11.3091 7.0421 11.301 7.08975 11.2843 7.13433C11.2799 7.14599 11.275 7.15747 11.2695 7.16871C11.2557 7.19658 11.238 7.22287 11.2163 7.24676C11.2122 7.25131 11.2079 7.25572 11.2034 7.25997L7.70396 10.7595C7.55751 10.906 7.31894 10.906 7.17249 10.7595C7.02604 10.6131 7.02604 10.3745 7.17249 10.2281L10.0303 7.375H2.25C2.04289 7.375 1.875 7.20711 1.875 7Z" fill="currentColor" />
      </svg>
    </button>
  )
}

export const EditBtn = ({ className, onClick }: { className?: string, onClick: () => void }) => {
  const { t } = useTranslation()

  return (
    <button
      type='button'
      className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer', className)}
      onClick={onClick}
    >
      <PencilIcon className='w-3 h-3' />
      <span>{t('common.operation.edit')}</span>
    </button>
  )
}

export const FootLogo = () => (
  <div className='h-4 w-11 rounded bg-gray-900/90' />
)
