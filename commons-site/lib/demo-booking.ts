/**
 * Public demo booking URL (Cal.com, Calendly, Google Appointment Schedule, etc.).
 * Override with NEXT_PUBLIC_DEMO_BOOKING_URL on commons-site if needed.
 * Default is the Pavilion Cal.com demo event.
 */
export const DEFAULT_DEMO_BOOKING_URL =
  'https://cal.com/robert-gregory-grfbze/demo' as const

export function getDemoBookingUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL?.trim() || DEFAULT_DEMO_BOOKING_URL
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Internal fallback when calendar URL is not configured. */
export const DEMO_BOOKING_FALLBACK_HREF = '/contact' as const
