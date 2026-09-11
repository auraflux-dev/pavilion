import Link from 'next/link'
import type { ReactNode } from 'react'
import { DEMO_BOOKING_FALLBACK_HREF, getDemoBookingUrl } from '@/lib/demo-booking'

type DemoBookingLinkProps = {
  children: ReactNode
  className?: string
  /** Prefer opening calendar when configured; otherwise /contact */
  preferCalendar?: boolean
  onClick?: () => void
}

/**
 * Book-a-demo CTA. Uses NEXT_PUBLIC_DEMO_BOOKING_URL when set; otherwise /contact.
 */
export function DemoBookingLink({
  children,
  className,
  preferCalendar = true,
  onClick,
}: DemoBookingLinkProps) {
  const calendarUrl = preferCalendar ? getDemoBookingUrl() : null

  if (calendarUrl) {
    return (
      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={DEMO_BOOKING_FALLBACK_HREF} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
