/**
 * GET /api/membership/shirt-options
 * Public list of membership perk tee designs × sizes still in stock.
 */
import { NextResponse } from 'next/server'
import { listMembershipShirtOptions } from '@/lib/membership-shirt'
import { reportError } from '@/lib/observability/error-reporting'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isDemoInstance()) {
      return NextResponse.json({
        productId: 'demo-hawks-tee',
        productName: `${DEMO_BRAND.mascotPlural} spirit tee`,
        designsEnabled: true,
        designs: [
          {
            design: `${DEMO_BRAND.mascot} crest`,
            sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL'].map((size) => ({
              size,
              variantId: `demo-${size}`,
              sku: `HAWK-${size}`,
              quantity: 12,
              available: true,
              label: size,
            })),
          },
        ],
        availableDesigns: [`${DEMO_BRAND.mascot} crest`],
        demo: true,
      })
    }
    const data = await listMembershipShirtOptions()
    const { isMembershipShirtDesignsEnabled } = await import('@/lib/membership-shirt')
    const designsEnabled = await isMembershipShirtDesignsEnabled()
    return NextResponse.json({
      productId: data.productId,
      productName: data.productName,
      designsEnabled,
      designs: designsEnabled
        ? data.designs.map((d) => ({
            design: d.design,
            sizes: d.sizes.map((s) => ({
              size: s.size,
              variantId: s.variantId,
              sku: s.sku,
              quantity: s.quantity,
              available: s.available,
              label: s.label,
            })),
          }))
        : [],
      availableDesigns: designsEnabled
        ? data.designs
            .filter((d) => d.sizes.some((s) => s.available))
            .map((d) => d.design)
        : [],
    })
  } catch (err) {
    console.error('membership/shirt-options', err)
    const eventId = await reportError(err, { route: '/api/membership/shirt-options' })
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not load shirt options. Staff may need to add Design · Size variants under The Cove stock setup.',
        eventId,
      },
      { status: 500 },
    )
  }
}
