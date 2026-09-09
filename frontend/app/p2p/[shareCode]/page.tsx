import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { P2pSharePage } from '@/components/fundraising/p2p-share-page'
import { getP2pPageByShareCode, resolveP2pOrgId } from '@/lib/p2p/store'

export const dynamic = 'force-dynamic'

export default async function PublicP2pPage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  const { shareCode } = await params
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost'
  const proto = h.get('x-forwarded-proto') || 'https'
  const req = new Request(`${proto}://${host}/p2p/${shareCode}`, { headers: h })
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) notFound()
  const page = await getP2pPageByShareCode(orgId, shareCode)
  if (!page) notFound()

  return (
    <P2pSharePage
      page={{
        shareCode: page.shareCode,
        ownerName: page.ownerName,
        blurb: page.blurb,
        raisedCents: page.raisedCents,
        campaignTitle: page.campaignTitle,
        campaignStory: page.campaignStory,
        campaignGoalCents: page.campaignGoalCents,
      }}
    />
  )
}
