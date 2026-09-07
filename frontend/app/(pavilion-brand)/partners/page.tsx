import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Partners' }

/** Partners list is peripheral for cold prospects. */
export default function PartnersPage() {
  redirect('/about')
}
