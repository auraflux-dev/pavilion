import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { Inter, Merriweather } from 'next/font/google'
import { GaAuthBridge } from '@/components/ga-auth-bridge'
import { GoogleAnalytics } from '@/components/google-analytics'
import { SiteAnalytics } from '@/components/site-analytics'
import { TrafficBeacon } from '@/components/traffic-beacon'
import { DemoBanner } from '@/components/demo/demo-banner'
import { CommonsSurfaceShell } from '@/components/demo/commons-surface-shell'
import { BrandPackShell } from '@/components/demo/brand-pack-shell'
import { publicBrandFace } from '@/lib/demo/brand'
import { getActiveBrandPack } from '@/lib/crm/active-trial-server'
import { publicSiteUrl } from '@/lib/demo/instance'
import { resolveCmsLayoutBrand } from '@/lib/cms/resolve-layout-brand'
import {
  isDemoRequestSurface,
  isTrialRequestSurface,
  requestHost,
} from '@/lib/crm/product-surface-server'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'] })

export async function generateMetadata(): Promise<Metadata> {
  const demo = await isDemoRequestSurface()
  const trial = await isTrialRequestSurface()
  const host = await requestHost()
  const brand = publicBrandFace()
  const siteUrl = publicSiteUrl(host)
  const titleDefault = `${brand.pto} | ${brand.cheer}`
  const description = demo
    ? `A vanilla PTO operating system demo: public site, family portal, and staff workspace for ${brand.school}.`
    : trial
      ? `Private Pavilion trial for ${brand.pto} (${brand.town}).`
      : 'The Stone Hill Middle School PTO is an active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.'

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleDefault,
      template: `%s | ${brand.short}`,
    },
    description,
    keywords: demo || trial
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
        : trial
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
      description:
        demo || trial
          ? description
          : 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
      images: [brand.logoPath],
    },
    robots: {
      index: !demo && !trial,
      follow: !demo && !trial,
    },
    icons: demo || trial ? [{ url: brand.logoPath }] : undefined,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const demo = await isDemoRequestSurface()
  const trial = await isTrialRequestSurface()
  const productSurface = demo || trial
  const pack = productSurface ? await getActiveBrandPack() : null
  const cmsLayout = productSurface ? await resolveCmsLayoutBrand() : null
  const dataPto = pack?.slug || (demo ? 'riverside' : trial ? 'commons' : 'shms')
  const packBrand = pack?.brand ?? null
  const mergedStyle = {
    ...(packBrand?.colors
      ? {
          ['--brand-green']: packBrand.colors.primary,
          ['--brand-dark']: packBrand.colors.dark,
          ['--brand-accent']: packBrand.colors.accent,
          ['--brand-warm']: packBrand.colors.warm,
          ['--brand-soft']: packBrand.colors.soft,
        }
      : {}),
    ...(cmsLayout?.cssVars ?? {}),
  } as CSSProperties
  const cmsClient = cmsLayout
    ? {
        logoUrl: cmsLayout.logoUrl || undefined,
        ptoName: cmsLayout.ptoName || undefined,
        schoolName: cmsLayout.schoolName || undefined,
        cheer: cmsLayout.cheer || undefined,
        fontSans: cmsLayout.fontSans || undefined,
        colors: {
          primary: cmsLayout.cssVars['--brand-green'],
          dark: cmsLayout.cssVars['--brand-dark'],
          accent: cmsLayout.cssVars['--brand-accent'],
          warm: cmsLayout.cssVars['--brand-warm'],
          soft: cmsLayout.cssVars['--brand-soft'],
        },
      }
    : null
  return (
    <html
      lang="en"
      data-pto={dataPto}
      className="bg-background"
      style={Object.keys(mergedStyle).length ? mergedStyle : undefined}
    >
      <head>
        {productSurface ? (
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          />
        ) : null}
        {cmsLayout?.faviconUrl ? (
          <link rel="icon" href={cmsLayout.faviconUrl} />
        ) : null}
      </head>
      <body className="font-sans antialiased text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-md"
          style={{ color: 'var(--brand-green)' }}
        >
          Skip to main content
        </a>
        <CommonsSurfaceShell enabled={productSurface}>
          <BrandPackShell brand={packBrand} slug={dataPto} cmsBrand={cmsClient}>
            <DemoBanner />
            {children}
          </BrandPackShell>
        </CommonsSurfaceShell>
        <TrafficBeacon />
        <GaAuthBridge />
        <SiteAnalytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
