import { Suspense } from 'react'
import { isDemoRequestSurface } from '@/lib/crm/product-surface-server'
import { ReviewJoinClient } from '@/app/review/review-join-client'

export default async function ReviewPage() {
  const isDemoHost = await isDemoRequestSurface()
  return (
    <Suspense fallback={<p className="text-center py-16 text-sm text-[#5A6070]">Loading…</p>}>
      <ReviewJoinClient isDemoHost={isDemoHost} />
    </Suspense>
  )
}
