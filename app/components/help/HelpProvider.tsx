'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { HelpModal } from '@/app/components/help/HelpModal'
import type { HelpPageContext, HelpTab } from '@/lib/help/types'

type HelpContextValue = {
  openHelp: (tab?: HelpTab) => void
  closeHelp: () => void
  setPageContext: (ctx: HelpPageContext) => void
  pageContext: HelpPageContext
}

const HelpContext = createContext<HelpContextValue | null>(null)

export function HelpProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<HelpTab>('context')
  const [pageContext, setPageContextState] = useState<HelpPageContext>({})

  const setPageContext = useCallback((ctx: HelpPageContext) => {
    setPageContextState(ctx)
  }, [])

  const openHelp = useCallback((nextTab: HelpTab = 'context') => {
    setTab(nextTab)
    setOpen(true)
  }, [])

  const closeHelp = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ openHelp, closeHelp, setPageContext, pageContext }),
    [openHelp, closeHelp, setPageContext, pageContext],
  )

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpModal open={open} onClose={closeHelp} />
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const ctx = useContext(HelpContext)
  if (!ctx) {
    throw new Error('useHelp debe usarse dentro de HelpProvider')
  }
  return ctx
}
