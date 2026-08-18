import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Inter, Merriweather } from 'next/font/google'
import { GaAuthBridge } from '@/components/ga-auth-bridge'
import { GoogleAnalytics } from '@/components/google-analytics'
import { TrafficBeacon } from '@/components/traffic-beacon'
import { DemoBanner } from '@/components/demo/demo-banner'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'] })

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
const demo = isDemoInstance()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: demo
      ? `${DEMO_BRAND.pto} | ${DEMO_BRAND.cheer}`
      : 'Stone Hill Middle School PTO | Go Stingrays!',
    template: demo ? `%s | ${DEMO_BRAND.short}` : '%s | SHMS PTO',
  },
  description: demo
    ? `A vanilla PTO operating system demo: public site, family portal, and staff workspace for ${DEMO_BRAND.school}.`
    : 'The Stone Hill Middle School PTO is an active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
  keywords: demo
    ? [DEMO_BRAND.school, 'PTO', 'demo']
    : [
        'Stone Hill Middle School',
        'PTO',
        'Ashburn',
        'Virginia',
        'Stingrays',
        'SHMS PTO',
      ],
  applicationName: demo ? DEMO_BRAND.short : 'SHMS PTO',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: demo ? DEMO_BRAND.short : 'SHMS PTO',
    title: demo
      ? `${DEMO_BRAND.pto} | ${DEMO_BRAND.cheer}`
      : 'Stone Hill Middle School PTO | Go Stingrays!',
    description: demo
      ? `A vanilla PTO operating system demo for ${DEMO_BRAND.school}.`
      : 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: [{ url: demo ? '/demo/mark.png' : '/shms-logo.png', width: 1200, height: 1200, alt: demo ? DEMO_BRAND.pto : 'SHMS PTO Stingrays' }],
  },
  twitter: {
    card: 'summary',
    title: demo
      ? `${DEMO_BRAND.pto} | ${DEMO_BRAND.cheer}`
      : 'Stone Hill Middle School PTO | Go Stingrays!',
    description: demo
      ? `A vanilla PTO operating system demo for ${DEMO_BRAND.school}.`
      : 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: [demo ? '/demo/mark.png' : '/shms-logo.png'],
  },
  robots: {
    index: !demo,
    follow: !demo,
  },
  icons: demo ? [{ url: '/demo/mark.png' }] : undefined,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-pto={demo ? 'riverside' : 'shms'} className="bg-background">
      <head>
        {demo ? (
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          />
        ) : null}
      </head>
      <body className="font-sans antialiased text-foreground">
        <DemoBanner />
        {children}
        <TrafficBeacon />
        <GaAuthBridge />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
