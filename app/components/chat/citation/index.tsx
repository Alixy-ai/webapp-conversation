'use client'

import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiArrowDownSLine, RiFileTextLine } from '@remixicon/react'
import type { CitationItem } from '../type'

interface Props {
  items: CitationItem[]
  /** badge clicked in the answer: open its document and scroll to it; `t` re-triggers */
  focus?: { n: number, t: number } | null
}

/**
 * Citation footer: one chip per document, expandable to show the cited
 * segments with their text (same grouping as Dify's official Citation UI).
 */
const Citation: FC<Props> = ({ items, focus }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // badge click: open the cited document, then scroll to the segment once rendered
  const pendingScroll = useRef<number | null>(null)
  useEffect(() => {
    const item = focus ? items[focus.n - 1] : undefined
    if (!focus || !item) { return }
    pendingScroll.current = focus.n
    setOpen(item.document_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  useEffect(() => {
    const n = pendingScroll.current
    if (n === null) { return }
    const timer = setTimeout(() => {
      pendingScroll.current = null
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-cite-n="${n}"]`) || rootRef.current
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 30)
    return () => clearTimeout(timer)
  }, [focus, open])

  const docs = useMemo(() => {
    const map = new Map<string, { document_id: string, document_name: string, dataset_name: string, segments: { n: number, item: CitationItem }[] }>()
    items.forEach((item, i) => {
      const doc = map.get(item.document_id) || { document_id: item.document_id, document_name: item.document_name, dataset_name: item.dataset_name, segments: [] }
      doc.segments.push({ n: i + 1, item })
      map.set(item.document_id, doc)
    })
    return Array.from(map.values())
  }, [items])

  if (!items.length) { return null }

  return (
    <div ref={rootRef} className='mt-3 border-t border-gray-100 pt-2'>
      <div className='mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400'>
        {t('app.chat.citation.title')}
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {docs.map(doc => (
          <button
            key={doc.document_id}
            type='button'
            onClick={() => setOpen(open === doc.document_id ? null : doc.document_id)}
            className={`flex max-w-[260px] items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${open === doc.document_id ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            title={doc.dataset_name ? `${doc.dataset_name} / ${doc.document_name}` : doc.document_name}
          >
            <RiFileTextLine className='h-3.5 w-3.5 shrink-0' />
            <span className='shrink-0 tabular-nums text-gray-400'>{doc.segments.map(s => s.n).join(',')}</span>
            <span className='truncate'>{doc.document_name}</span>
            <RiArrowDownSLine className={`h-3.5 w-3.5 shrink-0 transition-transform ${open === doc.document_id ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>
      {docs.filter(doc => doc.document_id === open).map(doc => (
        <div key={doc.document_id} className='mt-2 space-y-2 rounded-lg border border-gray-100 bg-white p-3'>
          {doc.dataset_name && <div className='text-[11px] text-gray-400'>{doc.dataset_name}</div>}
          {doc.segments.map(({ n, item }) => (
            <div key={item.segment_id} data-cite-n={n} className={`rounded text-xs leading-5 text-gray-700 ${focus?.n === n ? 'ring-1 ring-primary-200' : ''}`}>
              <div className='mb-0.5 flex items-center gap-2 text-[11px] text-gray-400'>
                <span className='rounded bg-gray-100 px-1 tabular-nums text-gray-600'>{n}</span>
                <span>{t('app.chat.citation.segment', { position: item.segment_position })}</span>
                {!!item.word_count && <span>{t('app.chat.citation.words', { count: item.word_count })}</span>}
                {!!item.hit_count && <span>{t('app.chat.citation.hits', { count: item.hit_count })}</span>}
              </div>
              <div className='max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-gray-50 px-2 py-1.5'>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default React.memo(Citation)
