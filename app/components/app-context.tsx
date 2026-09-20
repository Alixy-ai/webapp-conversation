'use client'

import { createContext, useContext } from 'react'
import type { PublicApp } from '@/lib/apps/types'

const AppContext = createContext<PublicApp | null>(null)

export const AppProvider = ({
  app,
  children,
}: {
  app: PublicApp
  children: React.ReactNode
}) => {
  return (
    <AppContext.Provider value={app}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const app = useContext(AppContext)
  if (!app) { throw new Error('Missing AppContext.Provider in the tree') }
  return app
}
