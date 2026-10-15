'use client'
import { Streamdown } from 'streamdown'
import type { ComponentProps } from 'react'
import 'katex/dist/katex.min.css'

type Components = ComponentProps<typeof Streamdown>['components']

interface StreamdownMarkdownProps {
  content: string
  className?: string
  /** element overrides, e.g. citation badges; keep the object stable */
  components?: Components
}

export function StreamdownMarkdown({ content, className = '', components }: StreamdownMarkdownProps) {
  return (
    <div className={`streamdown-markdown ${className}`}>
      <Streamdown components={components}>{content}</Streamdown>
    </div>
  )
}

export default StreamdownMarkdown
