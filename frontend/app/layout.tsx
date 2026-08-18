import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Inter, Merriweather } from 'next/font/google'
import { GaAuthBridge } from '@/components/ga-auth-bridge'
import { GoogleAnalytics } from '@/components/google-analytics'
import { TrafficBeacon } from '@/components/traffic-beacon'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'] })

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Stone Hill Middle School PTO | Go Stingrays!',
    template: '%s | SHMS PTO',
  },
  description:
    'The Stone Hill Middle School PTO is an active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
  keywords: [
    'Stone Hill Middle School',
    'PTO',
    'Ashburn',
    'Virginia',
    'Stingrays',
    'SHMS PTO',
  ],
  applicationName: 'SHMS PTO',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'SHMS PTO',
    title: 'Stone Hill Middle School PTO | Go Stingrays!',
    description:
      'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: [{ url: '/shms-logo.png', width: 1200, height: 1200, alt: 'SHMS PTO Stingrays' }],
  },
  twitter: {
    card: 'summary',
    title: 'Stone Hill Middle School PTO | Go Stingrays!',
    description:
      'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: ['/shms-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased text-foreground">
        {children}
        <TrafficBeacon />
        <GaAuthBridge />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
