'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { consumePendingAuth, gaSurface, trackLogin, trackSignUp } from '@/lib/ga'

/**
 * Completes Google (and other redirect) auth events after the session exists.
 * Email login/sign-up is recorded on the join form before redirect.
 */
export function GaAuthBridge() {
  const { status, isStaff } = useAuth()

  useEffect(() => {
    if (status !== 'member') return
    const pending = consumePendingAuth()
    if (!pending) return
    const surface = isStaff ? 'staff' : gaSurface()
    if (pending.action === 'sign_up') trackSignUp(pending.method, surface)
    else trackLogin(pending.method, surface)
  }, [status, isStaff])

  return null
}
