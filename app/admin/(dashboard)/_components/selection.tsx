'use client'

import type { FC, ReactNode } from 'react'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface SelectionValue {
  selected: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  setMany: (ids: string[], selected: boolean) => void
  clear: () => void
}

const SelectionContext = createContext<SelectionValue | null>(null)

/**
 * Selection state for the apps table. Render it with a `key` derived from the
 * current query so paging or searching starts from an empty selection.
 */
export const SelectionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<string[]>([])

  const value = useMemo<SelectionValue>(() => ({
    selected,
    isSelected: id => selected.includes(id),
    toggle: (id) => {
      setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
    },
    setMany: (ids, nextSelected) => {
      setSelected((prev) => {
        if (nextSelected) { return Array.from(new Set([...prev, ...ids])) }
        return prev.filter(id => !ids.includes(id))
      })
    },
    clear: () => setSelected([]),
  }), [selected])

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = () => {
  const context = useContext(SelectionContext)
  if (!context) { throw new Error('Missing SelectionContext.Provider in the tree') }
  return context
}

const checkbox = 'h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/30'

/** Header checkbox: selects / deselects every row of the current page. */
export const SelectAllCheckbox: FC<{ ids: string[] }> = ({ ids }) => {
  const { selected, setMany } = useSelection()
  const allSelected = ids.length > 0 && ids.every(id => selected.includes(id))
  const someSelected = !allSelected && ids.some(id => selected.includes(id))

  const ref = useCallback((node: HTMLInputElement | null) => {
    if (node) { node.indeterminate = someSelected }
  }, [someSelected])

  return (
    <input
      ref={ref}
      type='checkbox'
      className={checkbox}
      checked={allSelected}
      disabled={ids.length === 0}
      aria-label='Select all apps on this page'
      onChange={e => setMany(ids, e.target.checked)}
    />
  )
}

export const RowCheckbox: FC<{ id: string, label: string }> = ({ id, label }) => {
  const { isSelected, toggle } = useSelection()

  return (
    <input
      type='checkbox'
      className={checkbox}
      checked={isSelected(id)}
      aria-label={`Select ${label}`}
      onChange={() => toggle(id)}
    />
  )
}
