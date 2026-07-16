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

/**
 * Site login state + free vs paid membership summary.
 * - member/free: has Wix account (parent), may not have purchased Ruby/Supreme
 * - member/paid: purchased membership applied to Students and/or Memberships CMS
 */
export function useAuth(): AuthInfo {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [accountType, setAccountType] = useState<AccountType>('none')
  const [hasPaidMembership, setHasPaidMembership] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [isStaff, setIsStaff] = useState(false)
  const [staffRoles, setStaffRoles] = useState<string[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => {
        if (cancelled) return
        if (!r.ok) {
          setStatus('visitor')
          setMember(null)
          setAccountType('none')
          setHasPaidMembership(false)
          setStudentCount(0)
          setIsStaff(false)
          setStaffRoles([])
          return
        }
        const data = await r.json()
        setStatus('member')
        setMember(data.member ?? null)
        setAccountType((data.accountType as AccountType) ?? 'free')
        setHasPaidMembership(Boolean(data.hasPaidMembership))
        setStudentCount(Number(data.studentCount ?? 0))
        setIsStaff(Boolean(data.isStaff))
        setStaffRoles(Array.isArray(data.staffRoles) ? data.staffRoles : [])
      })
      .catch(() => {
        if (cancelled) return
        setStatus('visitor')
        setMember(null)
        setAccountType('none')
        setHasPaidMembership(false)
        setStudentCount(0)
        setIsStaff(false)
        setStaffRoles([])
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return {
    status,
    member,
    accountType,
    hasPaidMembership,
    studentCount,
    isStaff,
    staffRoles,
    refresh,
  }
}
