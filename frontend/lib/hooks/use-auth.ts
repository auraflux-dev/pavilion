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
  refresh: () => void
}

type AuthSnapshot = Omit<AuthInfo, 'refresh'>

/** Survives navbar remounts when each page renders its own <Navbar />. */
let cachedAuth: AuthSnapshot | null = null
let inflight: Promise<AuthSnapshot> | null = null

async function fetchAuth(): Promise<AuthSnapshot> {
  const visitor: AuthSnapshot = {
    status: 'visitor',
    member: null,
    accountType: 'none',
    hasPaidMembership: false,
    studentCount: 0,
    isStaff: false,
    staffRoles: [],
  }
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' })
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
      }
  )
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    cachedAuth = null
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

  return { ...snap, refresh }
}
