import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import './globals.css'

/** Same face as the school product UI (sell what they get). */
const nunito = Nunito({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${PRODUCT_NAME}. ${PRODUCT_TAGLINE} Public site and family login for parents. Staff for your board. $${COMMONS_LIST_PRICE_USD} per month.`,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} min-h-screen antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
