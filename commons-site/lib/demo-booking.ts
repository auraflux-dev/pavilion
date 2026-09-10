/**
 * Public demo booking URL (Cal.com, Calendly, Google Appointment Schedule, etc.).
 * Set NEXT_PUBLIC_DEMO_BOOKING_URL on commons-site (Vercel + local).
 * When unset, Book a Demo CTAs fall back to /contact.
 */
export function getDemoBookingUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL?.trim()
  if (!raw) return null
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
