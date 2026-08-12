import { redirect } from 'next/navigation'

/**
 * Short public URL for table QR stickers: /join → free signup.
 * Optional ?mode=login for returning parents.
 */
export default async function JoinRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; returnTo?: string }>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  const returnTo =
    sp.returnTo && sp.returnTo.startsWith('/') && !sp.returnTo.startsWith('//')
      ? sp.returnTo
      : '/member-portal'
  qs.set('returnTo', returnTo)
  if (sp.mode === 'login') qs.set('mode', 'login')
  redirect(`/auth/join?${qs.toString()}`)
}
