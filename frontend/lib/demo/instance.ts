/** True only on the demo Vercel project. Never set on www.shmspto.org. */
export function isDemoInstance(): boolean {
  return (
    process.env.DEMO_INSTANCE === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true'
  )
}

/** Client-safe. Next inlines this at build time per Vercel project. */
export function isPublicDemoInstance(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true'
}

const SHMS_SITE = 'https://www.shmspto.org'
const DEMO_SITE = 'https://commons-pto-demo.vercel.app'
const PLATFORM_SITE = 'https://commons-pto.vercel.app'

function isCommonsPlatformEnv(): boolean {
  return (
    process.env.COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'
  )
}

/** Canonical public origin. Demo/platform never publish shmspto.org in metadata. */
export function publicSiteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (isDemoInstance() || isCommonsPlatformEnv()) {
    if (env && !/shmspto\.org/i.test(env)) return env
    const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    if (vercelProd && !/shmspto/i.test(vercelProd)) return `https://${vercelProd}`
    return isCommonsPlatformEnv() ? PLATFORM_SITE : DEMO_SITE
  }
  return env || SHMS_SITE
}
