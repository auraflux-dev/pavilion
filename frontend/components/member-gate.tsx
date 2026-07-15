'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname, useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Suspense } from 'react'

interface Props {
  children: React.ReactNode
  /** Primary CTA when logged out */
  label?: string
  /** Extra returnTo query string (e.g. checkout=ruby&studentId=…) */
  returnToQuery?: string
}

function MemberGateInner({
  children,
  label = 'Log in or create a free account',
  returnToQuery,
}: Props) {
  const { status } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (status === 'loading') {
    return (
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
    )
  }

  if (status === 'visitor') {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (returnToQuery) {
      new URLSearchParams(returnToQuery).forEach((v, k) => params.set(k, v))
    }
    const qs = params.toString()
    const returnTo = encodeURIComponent(`${pathname}${qs ? `?${qs}` : ''}`)

    return (
      <a
        href={`/auth/login?returnTo=${returnTo}`}
        className="inline-flex items-center justify-center gap-2 w-full font-semibold text-sm px-4 py-2.5 rounded-lg border-2 transition-colors hover:bg-[#085508] hover:text-white hover:border-[#085508]"
        style={{ borderColor: '#085508', color: '#085508', backgroundColor: 'transparent' }}
      >
        <Lock className="w-3.5 h-3.5 shrink-0" />
        {label}
      </a>
    )
  }

  return <>{children}</>
}

/**
 * Wraps purchase / member-only actions.
 * Visitors are sent through Wix login/signup, then returned to the same page.
 */
export function MemberGate(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="opacity-50 pointer-events-none select-none">{props.children}</div>
      }
    >
      <MemberGateInner {...props} />
    </Suspense>
  )
}
