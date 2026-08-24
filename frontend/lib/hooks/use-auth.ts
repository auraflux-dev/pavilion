'use client'

import { useCallback, useEffect, useState } from 'react'

export type AuthStatus = 'loading' | 'member' | 'visitor'
/** free = Wix account with no paid Ruby/Supreme; paid = at least one paid student or Memberships row */
export type AccountType = 'none' | 'free' | 'paid'

export interface MemberProfile {
  id: string
  name: string
  email: string
  profileImage: string | null
  memberSince: string | null
}

export interface AuthInfo {
  status: AuthStatus
  member: MemberProfile | null
  accountType: AccountType
  hasPaidMembership: boolean
  studentCount: number
  isStaff: boolean
  staffRoles: string[]
  boardTitle: string
  staffName: string
  personalEmail: string
  needsPersonalEmail: boolean
  linkedHousehold: boolean
  viewingEmail: string
  refresh: () => void
}

type AuthSnapshot = Omit<AuthInfo, 'refresh'>

/** Survives navbar remounts when each page renders its own <Navbar />. */
let cachedAuth: AuthSnapshot | null = null
let inflight: Promise<AuthSnapshot> | null = null

/** Call after login/logout so nav refetches instead of reusing visitor snapshot. */
export function clearAuthCache() {
  cachedAuth = null
  inflight = null
}

async function fetchAuth(): Promise<AuthSnapshot> {
  const visitor: AuthSnapshot = {
    status: 'visitor',
    member: null,
    accountType: 'none',
    hasPaidMembership: false,
    studentCount: 0,
    isStaff: false,
    staffRoles: [],
    boardTitle: '',
    staffName: '',
    personalEmail: '',
    needsPersonalEmail: false,
    linkedHousehold: false,
    viewingEmail: '',
  }
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    if (!r.ok) return visitor
    const data = await r.json()
    if (data.status === 'visitor' || !data.member) return visitor
    return {
      status: 'member',
      member: data.member ?? null,
      accountType: (data.accountType as AccountType) ?? 'free',
      hasPaidMembership: Boolean(data.hasPaidMembership),
      studentCount: Number(data.studentCount ?? 0),
      isStaff: Boolean(data.isStaff),
      staffRoles: Array.isArray(data.staffRoles) ? data.staffRoles : [],
      boardTitle: String(data.boardTitle ?? ''),
      staffName: String(data.staffName ?? ''),
      personalEmail: String(data.personalEmail ?? ''),
      needsPersonalEmail: Boolean(data.needsPersonalEmail),
      linkedHousehold: Boolean(data.linkedHousehold),
      viewingEmail: String(data.viewingEmail ?? data.member?.email ?? ''),
    }
  } catch {
    return visitor
  }
}

function loadAuth(force = false): Promise<AuthSnapshot> {
  if (!force && cachedAuth && cachedAuth.status !== 'loading') {
    return Promise.resolve(cachedAuth)
  }
  if (!force && inflight) return inflight
  inflight = fetchAuth().then((snap) => {
    cachedAuth = snap
    inflight = null
    return snap
  })
  return inflight
}

/**
 * Site login state + free vs paid membership summary.
 * - member/free: has Wix account (parent), may not have purchased Ruby/Supreme
 * - member/paid: purchased membership applied to Students and/or Memberships CMS
 */
export function useAuth(): AuthInfo {
  const [snap, setSnap] = useState<AuthSnapshot>(
    () =>
      cachedAuth ?? {
        status: 'loading',
        member: null,
        accountType: 'none',
        hasPaidMembership: false,
        studentCount: 0,
        isStaff: false,
        staffRoles: [],
        boardTitle: '',
        staffName: '',
        personalEmail: '',
        needsPersonalEmail: false,
        linkedHousehold: false,
        viewingEmail: '',
      }
  )
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    clearAuthCache()
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const force = tick > 0
    loadAuth(force).then((next) => {
      if (!cancelled) setSnap(next)
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  // Refetch when tab restores from bfcache (back button after login).
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) refresh()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [refresh])

  return { ...snap, refresh }
}
