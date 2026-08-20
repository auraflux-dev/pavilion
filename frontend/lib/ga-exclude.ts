/**
 * Keep Robert's browsing + automation out of GA4 (and our first-party
 * traffic beacon / Vercel Analytics). Other staff traffic still counts.
 *
 * Opt out once: open https://www.shmspto.org/?ga_opt_out=1
 * Opt back in:  https://www.shmspto.org/?ga_opt_out=0
 *
 * Logging in as one of OWNER_EMAILS also opts that browser out.
 */

const OPT_OUT_KEY = 'shms_ga_opt_out'

/** Personal / president identities — not board role mailboxes broadly. */
const OWNER_EMAILS = new Set([
  'gregory.robert.c@gmail.com',
  'president@shmspto.org',
  'robertgregory@shmspto.org',
  'clipzworldmail@gmail.com',
])

const AUTOMATION_UA =
  /HeadlessChrome|Playwright|Puppeteer|PhantomJS|Selenium|\bCursor\b|Chrome-Lighthouse|Googlebot|bingbot|Bytespider|GPTBot|ClaudeBot|Amazonbot/i

function persistOptOut(on: boolean) {
  try {
    if (on) {
      localStorage.setItem(OPT_OUT_KEY, '1')
      document.cookie = `${OPT_OUT_KEY}=1; Path=/; Max-Age=31536000; SameSite=Lax`
    } else {
      localStorage.removeItem(OPT_OUT_KEY)
      document.cookie = `${OPT_OUT_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
    }
  } catch {
    /* ignore */
  }
}

function hasOptOutCookie(): boolean {
  try {
    return document.cookie.split(';').some((c) => c.trim() === `${OPT_OUT_KEY}=1`)
  } catch {
    return false
  }
}

function consumeOptOutQuery(): void {
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('ga_opt_out')
    if (raw === '1' || raw === 'true') persistOptOut(true)
    if (raw === '0' || raw === 'false') persistOptOut(false)
  } catch {
    /* ignore */
  }
}

function normEmail(email: string | null | undefined): string {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const e = normEmail(email)
  return Boolean(e) && OWNER_EMAILS.has(e)
}

export function isAutomationClient(): boolean {
  if (typeof window === 'undefined') return true
  const nav = navigator as Navigator & { webdriver?: boolean }
  if (nav.webdriver) return true
  if (AUTOMATION_UA.test(navigator.userAgent || '')) return true
  return false
}

export function isNonProductionHost(
  hostname = typeof window !== 'undefined' ? window.location.hostname : '',
): boolean {
  const host = String(hostname || '').toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true
  if (host.endsWith('.vercel.app')) return true
  return false
}

export type AnalyticsExcludeOpts = {
  /** Signed-in member / staff emails to check against OWNER_EMAILS. */
  emails?: Array<string | null | undefined>
}

/** True → do not load GA / beacon / Vercel Analytics for this browse. */
export function shouldExcludeAnalytics(opts: AnalyticsExcludeOpts = {}): boolean {
  if (typeof window === 'undefined') return true

  consumeOptOutQuery()

  if (isNonProductionHost()) return true
  if (isAutomationClient()) return true

  const ownerSession = (opts.emails ?? []).some((e) => isOwnerEmail(e))
  if (ownerSession) {
    persistOptOut(true)
    return true
  }

  try {
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  if (hasOptOutCookie()) return true

  return false
}
