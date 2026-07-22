import { LegalPageShell } from '@/components/legal/legal-page-shell'
import type { LegalDocSlug } from '@/lib/api/legal'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SLUGS = new Set<LegalDocSlug>([
  'privacy',
  'terms',
  'photo-release',
  'membership-terms',
  'enrichment-waiver',
  'enrichment-medical',
  'data-security',
])

export default async function LegalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!SLUGS.has(slug as LegalDocSlug)) notFound()
  return <LegalPageShell slug={slug as LegalDocSlug} />
}
