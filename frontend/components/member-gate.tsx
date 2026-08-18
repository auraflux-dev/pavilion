'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  children: React.ReactNode
  /** Primary CTA when logged out. single action, e.g. "Join Lagoon · $149" */
  label?: string
  /** Extra returnTo query string (e.g. checkout=ruby&studentId=…) */
  returnToQuery?: string
  /** Override visitor CTA classes (needed on dark/green heroes). */
  className?: string
}

function MemberGateInner({
  children,
  label = 'Create your free account',
  returnToQuery,
  className,
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
        href={`/auth/join?returnTo=${returnTo}`}
        className={
          className ??
          'inline-flex items-center justify-center w-full font-bold text-sm px-4 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90'
        }
        style={className ? undefined : { backgroundColor: 'var(--brand-green)', color: '#FFFFFF' }}
      >
        {label}
      </a>
    )
  }

  return <>{children}</>
}

/**
 * Wraps purchase / member-only actions.
 * Visitors create/sign in on /auth/join, then return to the same page.
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
