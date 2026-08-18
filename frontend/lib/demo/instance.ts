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
