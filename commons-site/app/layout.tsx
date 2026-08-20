import type { Metadata } from 'next'
import { Fraunces, Source_Sans_3 } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import './globals.css'

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const body = Source_Sans_3({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${PRODUCT_NAME}. ${PRODUCT_TAGLINE} Public site, family portal, and staff portal. $${COMMONS_LIST_PRICE_USD} per month.`,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} min-h-screen antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
