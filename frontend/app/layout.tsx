import type { Metadata } from 'next'
import { Inter, Merriweather } from 'next/font/google'
import { GaAuthBridge } from '@/components/ga-auth-bridge'
import { GoogleAnalytics } from '@/components/google-analytics'
import { SiteAnalytics } from '@/components/site-analytics'
import { TrafficBeacon } from '@/components/traffic-beacon'
import { DemoBanner } from '@/components/demo/demo-banner'
import { CommonsSurfaceShell } from '@/components/demo/commons-surface-shell'
import { publicBrandFace } from '@/lib/demo/brand'
import { activeTrialPackSlug, isCommonsPlatform } from '@/lib/crm/active-trial'
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'] })

const demo = isDemoInstance()
const commons = isCommonsPlatform()
const brand = publicBrandFace()
const surfaceShell = demo || commons
const siteUrl = publicSiteUrl()
const titleDefault = `${brand.pto} | ${brand.cheer}`
const description = demo
  ? `A vanilla PTO operating system demo: public site, family portal, and staff workspace for ${brand.school}.`
  : commons
    ? `Private Commons trial for ${brand.pto} (${brand.town}).`
    : 'The Stone Hill Middle School PTO is an active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: titleDefault,
    template: `%s | ${brand.short}`,
  },
  description,
  keywords: demo || commons
    ? [brand.school, 'PTO', brand.town, ...(demo ? ['demo'] : ['trial'])]
    : [
        'Stone Hill Middle School',
        'PTO',
        'Ashburn',
        'Virginia',
        'Stingrays',
        'SHMS PTO',
      ],
  applicationName: brand.short,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: brand.short,
    title: titleDefault,
    description: demo
      ? `A vanilla PTO operating system demo for ${brand.school}.`
      : commons
        ? description
        : 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: [
      {
        url: brand.logoPath,
        width: 1200,
        height: 1200,
        alt: `${brand.pto}`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: titleDefault,
    description: demo || commons ? description : 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
    images: [brand.logoPath],
  },
  robots: {
    index: !demo && !commons,
    follow: !demo && !commons,
  },
  icons: demo || commons ? [{ url: brand.logoPath }] : undefined,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-pto={
        demo ? 'riverside' : commons ? activeTrialPackSlug() || 'commons' : 'shms'
      }
      className="bg-background"
    >
      <head>
        {demo ? (
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          />
        ) : null}
      </head>
      <body className="font-sans antialiased text-foreground">
        <CommonsSurfaceShell enabled={surfaceShell}>
          <DemoBanner />
          {children}
        </CommonsSurfaceShell>
        <TrafficBeacon />
        <GaAuthBridge />
        <SiteAnalytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
