import { Fraunces, Source_Sans_3 } from 'next/font/google'
import { SiteFooter } from '@/components/pavilion-site/site-footer'
import { SiteHeader } from '@/components/pavilion-site/site-header'
import '@/app/(pavilion-brand)/pavilion-brand.css'

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

export function PavilionBrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pavilion-brand ${display.variable} ${body.variable} min-h-screen antialiased`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
