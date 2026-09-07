import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Gallery' }

/** Gallery screens now live on Product. Keep this route for old links. */
export default function GalleryPage() {
  redirect('/product')
}
