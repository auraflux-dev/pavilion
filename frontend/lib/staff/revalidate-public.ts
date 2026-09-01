/**
 * Bust Next.js ISR cache after staff CMS writes so www updates within seconds.
 */
import { revalidatePath } from 'next/cache'

/** Visitor program catalog, home preview, and program landings. */
export function revalidatePublicPrograms() {
  revalidatePath('/')
  revalidatePath('/programs')
  revalidatePath('/programs/fall-2026')
  revalidatePath('/programs/spring-2027')
  revalidatePath('/programs', 'layout')
  // Seat counts on program landings
  revalidatePath('/programs', 'page')
}

/** SiteSettings keys (nav, hero, announcements, etc.). */
export function revalidatePublicSiteShell() {
  revalidatePath('/', 'layout')
  revalidatePath('/membership')
  revalidatePath('/cove')
  revalidatePath('/contact')
  revalidatePath('/fundraising')
}

/** PageContent CMS rows. */
export function revalidatePublicPage(slug: string) {
  const s = String(slug ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!s || s === 'home') {
    revalidatePath('/')
    return
  }
  revalidatePath(`/${s}`)
}

/** Events collection → visitor events pages. */
export function revalidatePublicEvents() {
  revalidatePath('/events')
  revalidatePath('/events', 'layout')
}

/** Cove products / spirit wear storefront. */
export function revalidatePublicCove() {
  revalidatePath('/cove')
}
