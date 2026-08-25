'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * One-open-at-a-time Staff section state (Membership Invite/Roster/Outreach, etc.).
 * Remembers the open id in localStorage and follows #hash jump links.
 */
export function useStaffExclusiveSection(
  storageKey: string,
  sectionIds: readonly string[],
  defaultId: string,
) {
  const [openId, setOpenIdState] = useState(defaultId)

  const setOpenId = useCallback(
    (id: string) => {
      // Allow '' to collapse all when defaultId is empty.
      if (id !== '' && !sectionIds.includes(id)) return
      setOpenIdState(id)
      try {
        window.localStorage.setItem(storageKey, id)
      } catch {
        /* ignore */
      }
    },
    [sectionIds, storageKey],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw === '') {
        setOpenIdState('')
        return
      }
      if (raw && sectionIds.includes(raw)) setOpenIdState(raw)
    } catch {
      /* ignore */
    }
  }, [storageKey, sectionIds])

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash && sectionIds.includes(hash)) setOpenId(hash)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [sectionIds, setOpenId])

  return {
    openId,
    setOpenId,
    isOpen: (id: string) => openId === id,
    collapseAll: () => setOpenId(''),
  }
}

export function StaffSectionTab({
  active,
  title,
  hint,
  badge,
  onSelect,
}: {
  active: boolean
  title: string
  hint?: string
  badge?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border-2 px-3 py-3 text-left transition-colors ${
        active
          ? 'border-[var(--brand-green)] bg-white'
          : 'border-[var(--border)] bg-white hover:border-[var(--brand-green)]/40'
      }`}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-[#1A1A1A]">
            {active ? title : `Show ${title}`}
          </span>
          {badge ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 tabular-nums">
              {badge}
            </span>
          ) : null}
        </span>
        {!active ? (
          <span className="shrink-0 text-xs font-bold text-[#5A6070]">Show</span>
        ) : null}
      </span>
      {hint ? (
        <span className="block text-[11px] text-[#5A6070] mt-0.5 leading-snug">{hint}</span>
      ) : null}
    </button>
  )
}
