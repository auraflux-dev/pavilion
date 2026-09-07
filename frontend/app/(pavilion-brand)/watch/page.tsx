import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Watch' }

/** Video slots are empty. Send prospects to product + demo instead. */
export default function WatchPage() {
  redirect('/product')
}
