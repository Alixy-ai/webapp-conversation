import type { FC } from 'react'
import classNames from 'classnames'
import { BASE_PATH } from '@/config'
import { isImageUrl } from '@/utils/branding'
import style from './style.module.css'

export interface AppIconProps {
  size?: 'xs' | 'tiny' | 'small' | 'medium' | 'large'
  rounded?: boolean
  icon?: string
  background?: string
  className?: string
}

const AppIcon: FC<AppIconProps> = ({
  size = 'medium',
  rounded = false,
  icon = '🤖',
  background,
  className,
}) => {
  if (!icon) { return null }

  return (
    <span
      className={classNames(
        style.appIcon,
        size !== 'medium' && style[size],
        rounded && style.rounded,
        className ?? '',
      )}
      style={{
        background,
      }}
    >
      {isImageUrl(icon)
        // app-rooted icons ('/logo.png') have to follow the sub-path as well;
        // absolute URLs and data: URIs are used as-is
        ? <img src={icon.startsWith('/') ? `${BASE_PATH}${icon}` : icon} alt="" className='w-full h-full object-contain rounded-[inherit]' />
        : icon}
    </span>
  )
}

export default AppIcon
