import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { GoogleAnalytics } from '@/components/google-analytics'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import './globals.css'

/** Single sans family for all marketing type (paired with Business Rocket). */
const sans = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${PRODUCT_NAME}. ${PRODUCT_TAGLINE} Public site and family login for parents. Staff for your team. $${COMMONS_LIST_PRICE_USD} per month.`,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} font-sans`}>
      <body className={`${sans.className} min-h-screen bg-zinc-50 font-sans text-slate-900 antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
