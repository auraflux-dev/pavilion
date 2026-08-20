'use client'

/**
 * One-shot Staff Home alert: Diane’s Member Newsletter walkthrough is ready to review.
 * Dismissed per browser (localStorage) so it does not nag after she opens it.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'staff-notice-diane-newsletter-walkthrough-v1'
const HELP_HREF = '/staff?view=help&article=member-newsletter-diane'

export function StaffWalkthroughNotice({
  roles,
  email,
}: {
  roles: string[]
  email: string
}) {
  const [visible, setVisible] = useState(false)

  const isAudience =
    roles.includes('marketing') ||
    roles.includes('admin') ||
    email.toLowerCase() === 'vp-marketing@shmspto.org'

  useEffect(() => {
    if (!isAudience) return
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'dismissed') return
    } catch {
      /* private mode — still show */
    }
    setVisible(true)
  }, [isAudience])

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed')
    } catch {
      /* ok */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="rounded-xl border border-[var(--brand-green)]/30 bg-[#E8F3E8] p-4 sm:p-5"
      role="status"
    >
      <div className="flex items-start gap-3">
        <PlayCircle
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: 'var(--brand-green)' }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-bold text-[#1A1A1A]">
            Diane — Member Newsletter walkthrough is ready to review
          </p>
          <p className="text-sm leading-relaxed text-[#5A6070] whitespace-pre-line">
            Short training video plus screenshots for Canva PNGs, test sends, Weekly Scoop, and schedule.
            {'\n'}
            Open it from Help, or from Newsletter → How this works.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="text-white" style={{ backgroundColor: 'var(--brand-green)' }}>
              <Link href={HELP_HREF} onClick={dismiss}>
                Watch walkthrough
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/staff?view=newsletter">Open Newsletter</Link>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss} className="text-[#5A6070]">
              Dismiss
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-[#5A6070] hover:bg-white/70"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
