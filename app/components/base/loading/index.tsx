import React from 'react'
import type { FC } from 'react'

import './style.css'

interface ILoadingProps {
  type?: 'area' | 'app'
}
const Loading: FC<ILoadingProps> = (
  { type = 'area' }: ILoadingProps = { type: 'area' },
) => {
  return (
    <div className={`flex w-full justify-center items-center ${type === 'app' ? 'h-full' : ''}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className='loading-ring'>
        <circle cx="10" cy="10" r="8" stroke="#E5E7EB" strokeWidth="2" />
        <path d="M10 2 A8 8 0 0 1 18 10" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default Loading
