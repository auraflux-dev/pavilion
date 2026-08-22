/**
 * GET /api/checkout/consent?kind=membership|program
 * Returns required legal docs for checkout checkboxes (CMS-editable).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  loadConsentDocs,
  type CheckoutConsentKind,
} from '@/lib/checkout-consent'

export const dynamic = 'force-dynamic'

const KINDS = new Set<CheckoutConsentKind>([
  'membership',
  'program',
  'store-card',
  'product',
  'event',
  'donation',
  'cart',
])

export async function GET(req: NextRequest) {
  const kind = (req.nextUrl.searchParams.get('kind') || '') as CheckoutConsentKind
  const kindsParam = req.nextUrl.searchParams.get('kinds') || ''
  const kinds = kindsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is CheckoutConsentKind => KINDS.has(s as CheckoutConsentKind) && s !== 'cart')
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }
  try {
    const items = await loadConsentDocs(kind, kind === 'cart' ? kinds : undefined)
    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        label: item.label,
        required: item.required,
        mode: item.mode,
        doc: {
          title: item.doc.title,
          updated: item.doc.updated,
          sections: item.doc.sections,
        },
      })),
    })
  } catch (err) {
    console.error('checkout consent GET', err)
    return NextResponse.json({ error: 'Could not load terms' }, { status: 500 })
  }
}
