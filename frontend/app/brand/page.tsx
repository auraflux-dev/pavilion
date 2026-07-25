import type { Metadata } from 'next'
import { COVE_LOGO } from '@/components/brand/cove-logo'

export const metadata: Metadata = {
  title: 'Brand assets (internal)',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Hidden asset shelf — not linked from nav.
 * After deploy, files are public at https://www.shmspto.org/brand/...
 * (and listed here) so Canva / tools can fetch HTTPS URLs.
 */
const ASSETS: { label: string; href: string; note: string }[] = [
  { label: 'Cove logo (default)', href: COVE_LOGO.default, note: 'Transparent PNG · web' },
  { label: 'Cove logo master', href: COVE_LOGO.master, note: 'Transparent PNG · source' },
  { label: 'Cove 128', href: COVE_LOGO.uiSm, note: 'UI tiny' },
  { label: 'Cove 256', href: COVE_LOGO.ui, note: 'Portal / UI' },
  { label: 'Cove 512', href: '/brand/cove-logo-512.png', note: 'Transparent square' },
  { label: 'Cove 640', href: '/brand/cove-logo-640.png', note: 'Transparent square' },
  { label: 'Cove 1080', href: COVE_LOGO.video, note: 'Video overlay' },
  { label: 'WhatsApp JPG 640', href: COVE_LOGO.whatsapp, note: 'Opaque cream · group photo' },
  { label: 'WhatsApp JPG 512', href: COVE_LOGO.whatsappAlt, note: 'Opaque cream' },
  { label: 'WhatsApp PNG 640', href: COVE_LOGO.whatsappPng, note: 'Opaque cream' },
]

export default function BrandAssetsPage() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A6070] mb-2">
          Internal · not in nav · noindex
        </p>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Brand assets</h1>
        <p className="text-sm text-[#5A6070] mt-2 leading-relaxed">
          Stable public files for Canva, video, and WhatsApp. Prefer the HTTPS URL after deploy
          (same path under {site}).
        </p>

        <ul className="mt-8 space-y-6">
          {ASSETS.map((a) => {
            const absolute = `${site}${a.href}`
            return (
              <li
                key={a.href}
                className="rounded-xl border border-[#E8E4DC] bg-white p-4 flex flex-col sm:flex-row gap-4 items-start"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.href}
                  alt=""
                  className="w-28 h-28 object-contain rounded-lg border border-[#F0EDE8] bg-[length:12px_12px] bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%,#eee),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%,#eee)] bg-[position:0_0,6px_6px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1A1A1A]">{a.label}</p>
                  <p className="text-xs text-[#5A6070] mt-0.5">{a.note}</p>
                  <a
                    href={a.href}
                    className="block text-xs font-mono mt-2 break-all"
                    style={{ color: '#085508' }}
                  >
                    {a.href}
                  </a>
                  <p className="text-[11px] font-mono text-[#8A8F9C] mt-1 break-all">{absolute}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
