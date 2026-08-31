import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { getPool } from '@/lib/crm/db'
import { hashPassword, verifyPassword } from '@/lib/crm/bcrypt-password'
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

export const AUTH_BASE_PATH = '/api/id'

function authSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.DEMO_SIGNING_SECRET ||
    ''
  )
}

export function createCommonsAuth() {
  const pool = getPool()
  const secret = authSecret()
  if (!pool || !secret || secret.length < 32) return null
  return betterAuth({
    database: pool,
    secret,
    baseURL: process.env.BETTER_AUTH_URL || publicSiteUrl(),
    basePath: AUTH_BASE_PATH,
    trustedOrigins: (request) => {
      const base = [
        publicSiteUrl(),
        `https://${process.env.PAVILION_DEMO_HOST || 'demo.onpavilion.com'}`,
        'https://onpavilion.com',
        'https://www.onpavilion.com',
        'https://commons-pto-demo.vercel.app',
        'https://commons-pto.vercel.app',
      ]
      if (!request) return base
      const origin = request.headers.get('origin') || ''
      const suffix = (
        process.env.PAVILION_TRIAL_DOMAIN_SUFFIX ||
        process.env.COMMONS_TEMP_DOMAIN_SUFFIX ||
        'onpavilion.com'
      )
        .replace(/^\./, '')
        .toLowerCase()
      try {
        if (origin) {
          const host = new URL(origin).hostname.toLowerCase()
          if (host === suffix || host.endsWith(`.${suffix}`)) {
            return [...base, origin]
          }
        }
      } catch {
        // ignore
      }
      const host =
        request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase().split(':')[0] ||
        request.headers.get('host')?.trim().toLowerCase().split(':')[0] ||
        ''
      if (host && (host === suffix || host.endsWith(`.${suffix}`))) {
        return [...base, `https://${host}`]
      }
      return base
    },
    emailAndPassword: {
      enabled: true,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    plugins: [nextCookies()],
  })
}

let cached: ReturnType<typeof createCommonsAuth> | undefined

export function getAuth() {
  if (!isDemoInstance() && !isPavilionProductPlatform()) {
    return null
  }
  if (cached !== undefined) return cached
  cached = createCommonsAuth()
  return cached
}
