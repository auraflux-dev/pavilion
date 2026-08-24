'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type InlineCopyContextValue = {
  canEdit: boolean
  editMode: boolean
  setEditMode: (next: boolean) => void
  saving: boolean
  saveCopy: (target: import('@/lib/cms/inline-edit-target').InlineEditTarget, value: string) => Promise<boolean>
  status: string
}

const InlineCopyContext = createContext<InlineCopyContextValue>({
  canEdit: false,
  editMode: false,
  setEditMode: () => {},
  saving: false,
  saveCopy: async () => false,
  status: '',
})

export function InlineCopyProvider({ children }: { children: React.ReactNode }) {
  const [canEdit, setCanEdit] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('/api/staff/me')
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        setCanEdit(Boolean(data.isAdmin))
      })
      .catch(() => setCanEdit(false))
  }, [])

  const saveCopy = useCallback(async (target: import('@/lib/cms/inline-edit-target').InlineEditTarget, value: string) => {
    setSaving(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/inline-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, value }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Save failed')
      setStatus('Saved. Refresh to see cache updates everywhere.')
      return true
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const value = useMemo(
    () => ({ canEdit, editMode, setEditMode, saving, saveCopy, status }),
    [canEdit, editMode, saving, saveCopy, status],
  )

  return <InlineCopyContext.Provider value={value}>{children}</InlineCopyContext.Provider>
}

export function useInlineCopy() {
  return useContext(InlineCopyContext)
}
