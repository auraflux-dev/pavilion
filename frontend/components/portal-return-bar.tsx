'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { isPublicDemoInstance } from '@/lib/demo/instance'

/**
 * Shown under the public nav when a member is logged in,
 * so they can return to the portal without the browser back button.
 */
export function PortalReturnBar() {
  const { status } = useAuth()
  const pathname = usePathname()
  if (status !== 'member') return null
  if (isPublicDemoInstance() && !pathname.startsWith('/member-portal')) return null

  return (
    <div
      className="border-t border-[var(--brand-line)]"
      style={{ backgroundColor: 'var(--brand-soft)' }}
      role="navigation"
      aria-label="Return to Member Portal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <Link
          href="/member-portal"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: 'var(--brand-green)' }}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          Return to Member Portal
        </Link>
      </div>
    </div>
  )
}
