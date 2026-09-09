import { SiteFooter } from '@/components/pavilion-site/site-footer'
import { SiteHeader } from '@/components/pavilion-site/site-header'
import '@/app/(pavilion-brand)/pavilion-brand.css'

/** Marketing shell uses product tokens + Nunito (same as school surfaces). */
export function PavilionBrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pavilion-brand min-h-screen antialiased">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
