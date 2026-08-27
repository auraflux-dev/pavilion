/** Cookie helpers safe for Edge middleware. No Postgres. */

export function hasBetterAuthCookie(cookieNames: string[]): boolean {
  return cookieNames.some(
    (name) => name.includes('better-auth') && name.includes('session_token'),
  )
}

export function isCommonsPlatformHost(): boolean {
  const platform =
    process.env.COMMONS_PLATFORM === 'true' || process.env.PAVILION_PLATFORM === 'true'
  return platform && process.env.DEMO_INSTANCE !== 'true'
}
