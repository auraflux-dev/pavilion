/**
 * Product platform env (legacy COMMONS_* + PAVILION_* alias).
 * Safe for Edge and Node. Demo Riverside is separate (DEMO_INSTANCE).
 */
export function isPavilionProductPlatform(): boolean {
  return (
    process.env.COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true' ||
    process.env.PAVILION_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_PAVILION_PLATFORM === 'true'
  )
}

/** Client-inlined flag for Staff UI conditionals. */
export function isPavilionProductPlatformPublic(): boolean {
  return (
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_PAVILION_PLATFORM === 'true'
  )
}
