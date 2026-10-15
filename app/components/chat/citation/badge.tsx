'use client'

import type { AnchorHTMLAttributes, FC } from 'react'
import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CitationItem } from '../type'
import { citeNumberFromHref } from '@/utils/citation'

const TIP_W = 320
const TIP_MAX_H = 240
const GAP = 6
const MARGIN = 8

interface BadgeProps {
  n: number
  item?: CitationItem
  onOpen?: (n: number) => void
}

/**
 * Inline citation badge at the end of the sentence it supports. The preview
 * is portalled to <body> with fixed, viewport-clamped coordinates so it never
 * spills off-screen or gets clipped by a scroll container.
 */
export const CitationBadge: FC<BadgeProps> = ({ n, item, onOpen }) => {
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ left: number, top: number, width: number, height: number } | null>(null)

  useLayoutEffect(() => {
    if (!show) { setPos(null); return }
    const place = () => {
      if (!btnRef.current) { return }
      const r = btnRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.max(0, Math.min(TIP_W, vw - MARGIN * 2))
      // never taller than the viewport, otherwise no top value keeps it inside
      const h = Math.min(tipRef.current?.offsetHeight || TIP_MAX_H, TIP_MAX_H, Math.max(0, vh - MARGIN * 2))
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, MARGIN), Math.max(MARGIN, vw - width - MARGIN))
      const above = r.top - GAP - h
      const below = r.bottom + GAP
      // above if it fits, else below, else clamp inside the viewport
      const top = above >= MARGIN ? above : Math.max(MARGIN, Math.min(below, vh - h - MARGIN))
      setPos({ left, top, width, height: h })
    }
    place()
    const raf = requestAnimationFrame(place) // re-measure with the real height
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [show])

  return (
    <span className='cite-badge inline-block align-super'>
      <button
        ref={btnRef}
        type='button'
        onClick={(e) => { e.preventDefault(); setShow(false); onOpen?.(n) }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className='mx-[1px] inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary-50 px-1 text-[10px] font-medium leading-none tabular-nums text-primary-700 hover:bg-primary-100'
        aria-label={item ? `${n}: ${item.document_name}` : String(n)}
      >
        {n}
      </button>
      {show && item && typeof document !== 'undefined' && createPortal(
        <div
          ref={tipRef}
          role='tooltip'
          style={{
            position: 'fixed',
            left: pos?.left ?? 0,
            top: pos?.top ?? 0,
            width: pos?.width ?? TIP_W,
            maxHeight: pos?.height ?? TIP_MAX_H,
            visibility: pos ? 'visible' : 'hidden',
          }}
          className='pointer-events-none z-[1000] overflow-hidden rounded-lg border border-gray-200 bg-white p-2 text-left text-xs font-normal leading-5 text-gray-700 shadow-lg'
        >
          <div className='mb-1 truncate text-[11px] font-medium text-gray-500'>{n}. {item.document_name}</div>
          <div className='line-clamp-[9] whitespace-pre-wrap break-words'>{item.content}</div>
        </div>,
        document.body,
      )}
    </span>
  )
}

/**
 * `components` override for StreamdownMarkdown: links produced by
 * `renderMarkers` become badges, all other links render as usual.
 */
export const makeCitationComponents = (items: CitationItem[], onOpen?: (n: number) => void) => ({
  a: ({ href, children, node: _node, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => {
    const n = citeNumberFromHref(href)
    if (n !== null) { return <CitationBadge n={n} item={items[n - 1]} onOpen={onOpen} /> }
    return <a href={href} target='_blank' rel='noopener noreferrer' className='font-medium text-primary-600 underline' {...props}>{children}</a>
  },
})
