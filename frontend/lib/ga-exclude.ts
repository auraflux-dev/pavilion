/**
 * Keep staff, local/preview, automation, and personal opt-out out of GA4
 * (and our first-party traffic beacon / Vercel Analytics).
 *
 * Opt out once: open https://www.shmspto.org/?ga_opt_out=1
 * Opt back in:  https://www.shmspto.org/?ga_opt_out=0
 */

const OPT_OUT_KEY = 'shms_ga_opt_out'

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

export function isAutomationClient(): boolean {
  if (typeof window === 'undefined') return true
  const nav = navigator as Navigator & { webdriver?: boolean }
  if (nav.webdriver) return true
  if (AUTOMATION_UA.test(navigator.userAgent || '')) return true
  return false
}

export function isNonProductionHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  const host = String(hostname || '').toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true
  // Preview / branch deploys (production is shmspto.org / www)
  if (host.endsWith('.vercel.app')) return true
  return false
}

export type AnalyticsExcludeOpts = {
  isStaff?: boolean
  pathname?: string
}

/** True → do not load GA / beacon / Vercel Analytics for this browse. */
export function shouldExcludeAnalytics(opts: AnalyticsExcludeOpts = {}): boolean {
  if (typeof window === 'undefined') return true

  consumeOptOutQuery()

  if (isNonProductionHost()) return true
  if (isAutomationClient()) return true

  const path = opts.pathname ?? window.location.pathname
  if (path.startsWith('/staff')) return true
  if (opts.isStaff) return true

  try {
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  if (hasOptOutCookie()) return true

  return false
}
