'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  consumePendingAuth,
  gaSurface,
  gaUserIdFromMemberId,
  setGaUserId,
  trackLogin,
  trackSignUp,
} from '@/lib/ga'

/**
 * Completes Google (and other redirect) auth events after the session exists.
 * Email login/sign-up is recorded on the join form before redirect.
 * Also binds hashed GA4 user_id once the member profile is known.
 */
export function GaAuthBridge() {
  const { status, isStaff, member } = useAuth()

  useEffect(() => {
    if (status !== 'member') return
    const pending = consumePendingAuth()
    if (!pending) return
    const surface = isStaff ? 'staff' : gaSurface()
    if (pending.action === 'sign_up') trackSignUp(pending.method, surface)
    else trackLogin(pending.method, surface)
  }, [status, isStaff])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (status === 'loading') return
      if (status !== 'member' || !member?.id) {
        setGaUserId(null)
        return
      }
      const uid = await gaUserIdFromMemberId(member.id)
      if (cancelled) return
      setGaUserId(uid)
    })()
    return () => {
      cancelled = true
    }
  }, [status, member?.id])

  return null
}
