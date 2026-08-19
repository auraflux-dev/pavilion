import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { getPool } from '@/lib/crm/db'
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'

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
    trustedOrigins: [
      publicSiteUrl(),
      'https://commons-pto-demo.vercel.app',
    ],
    emailAndPassword: { enabled: true },
    plugins: [nextCookies()],
  })
}

let cached: ReturnType<typeof createCommonsAuth> | undefined

export function getAuth() {
  if (!isDemoInstance()) return null
  if (cached !== undefined) return cached
  cached = createCommonsAuth()
  return cached
}
