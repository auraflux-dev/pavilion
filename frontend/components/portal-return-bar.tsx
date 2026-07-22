'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

/**
 * Shown on public marketing pages when a member is logged in,
 * so they can get back to the portal without using the browser back button.
 */
export function PortalReturnBar() {
  const { status } = useAuth()
  if (status !== 'member') return null

  return (
    <div
      className="border-b border-[#D4E8D4]"
      style={{ backgroundColor: '#EEF6EE' }}
      role="navigation"
      aria-label="Return to Member Portal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <Link
          href="/member-portal"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: '#085508' }}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          Member Portal
        </Link>
        <span className="text-xs text-[#5A6070] hidden sm:inline">
          You’re signed in · return anytime
        </span>
      </div>
    </div>
  )
}
