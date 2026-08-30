'use client'

/**
 * Live on-page layout editor for staff admins (demo/trial page builder).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cmsPageBuilderEnabledPublic } from '@/lib/cms/page-builder-flag'
import { useInlineCopy } from '@/components/cms/inline-copy-context'

export type LiveSectionRow = {
  id: string
  pageSlug: string
  sortOrder: number
  sectionType: string
  data: Record<string, unknown>
  active: boolean
}

type LiveEditorContextValue = {
  pageBuilderOn: boolean
  canLayoutEdit: boolean
  layoutEditMode: boolean
  setLayoutEditMode: (next: boolean) => void
  pageSlug: string
  setPageSlug: (slug: string) => void
  sections: LiveSectionRow[]
  setSections: React.Dispatch<React.SetStateAction<LiveSectionRow[]>>
  loadingSections: boolean
  reloadSections: () => Promise<void>
  ensureEditablePage: () => Promise<boolean>
  status: string
  setStatus: (s: string) => void
}

const LiveEditorContext = createContext<LiveEditorContextValue>({
  pageBuilderOn: false,
  canLayoutEdit: false,
  layoutEditMode: false,
  setLayoutEditMode: () => {},
  pageSlug: 'home',
  setPageSlug: () => {},
  sections: [],
  setSections: () => {},
  loadingSections: false,
  reloadSections: async () => {},
  ensureEditablePage: async () => false,
  status: '',
  setStatus: () => {},
})

export function LiveEditorProvider({
  pageSlug: initialSlug,
  children,
}: {
  pageSlug: string
  children: ReactNode
}) {
  const { canEdit } = useInlineCopy()
  const pageBuilderOn = cmsPageBuilderEnabledPublic()
  const canLayoutEdit = canEdit && pageBuilderOn

  const [pageSlug, setPageSlug] = useState(initialSlug || 'home')
  const [layoutEditMode, setLayoutEditMode] = useState(false)
  const [sections, setSections] = useState<LiveSectionRow[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setPageSlug(initialSlug || 'home')
  }, [initialSlug])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    if (q.get('edit') === '1' && canLayoutEdit) setLayoutEditMode(true)
  }, [canLayoutEdit])

  const reloadSections = useCallback(async () => {
    if (!canLayoutEdit) return
    setLoadingSections(true)
    try {
      const r = await fetch(`/api/staff/page-sections?page=${encodeURIComponent(pageSlug)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load sections')
      setSections(d.sections ?? [])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to load sections')
      setSections([])
    } finally {
      setLoadingSections(false)
    }
  }, [canLayoutEdit, pageSlug])

  useEffect(() => {
    if (layoutEditMode && canLayoutEdit) void reloadSections()
  }, [layoutEditMode, canLayoutEdit, reloadSections])

  const ensureEditablePage = useCallback(async () => {
    if (!canLayoutEdit) return false
    setStatus('')
    const appShell = [
      'membership',
      'programs',
      'events',
      'cove',
      'volunteer',
      'board',
      'fundraising',
      'newsletter',
      'meetings',
      'contact',
    ]
    if (appShell.includes(pageSlug)) {
      const ok = window.confirm(
        'Turn this into a fully editable page?\n\nThe current built-in layout will be replaced by sections you compose. You can keep editing anytime with Edit page layout.',
      )
      if (!ok) return false
    }
    try {
      const r = await fetch(`/api/staff/page-sections?page=${encodeURIComponent(pageSlug)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to open editor')
      setSections(d.sections ?? [])
      setLayoutEditMode(true)
      const url = new URL(window.location.href)
      url.searchParams.set('edit', '1')
      window.history.replaceState({}, '', url.toString())
      return true
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to open editor')
      return false
    }
  }, [canLayoutEdit, pageSlug])

  const value = useMemo(
    () => ({
      pageBuilderOn,
      canLayoutEdit,
      layoutEditMode,
      setLayoutEditMode: (next: boolean) => {
        setLayoutEditMode(next)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          if (next) url.searchParams.set('edit', '1')
          else url.searchParams.delete('edit')
          window.history.replaceState({}, '', url.toString())
        }
      },
      pageSlug,
      setPageSlug,
      sections,
      setSections,
      loadingSections,
      reloadSections,
      ensureEditablePage,
      status,
      setStatus,
    }),
    [
      pageBuilderOn,
      canLayoutEdit,
      layoutEditMode,
      pageSlug,
      sections,
      loadingSections,
      reloadSections,
      ensureEditablePage,
      status,
    ],
  )

  return <LiveEditorContext.Provider value={value}>{children}</LiveEditorContext.Provider>
}

export function useLiveEditor() {
  return useContext(LiveEditorContext)
}
