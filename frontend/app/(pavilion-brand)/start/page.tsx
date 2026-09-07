import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Start' }

/** Checkout lives on Pricing. Keep this route for old links. */
export default function StartPage() {
  redirect('/pricing#checkout')
}
