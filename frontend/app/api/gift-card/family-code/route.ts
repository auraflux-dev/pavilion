import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  ensureCoveFamilyCode,
  resetCoveFamilyCode,
} from '@/lib/cove-family-code'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { getGiftCardBalance } from '@/lib/square'
import { syncFamilyCoveRedeems } from '@/lib/cove-redeem-sync'

/**
 * GET  /api/gift-card/family-code. ensure + return family Cove window code
 * POST /api/gift-card/family-code { action: 'reset' }. rotate code
 */
export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const family = await listFamilyStudents(session.email)
    if (family.length === 0) {
      return NextResponse.json({
        coveFamilyCode: null,
        balance: 0,
        gan: '',
        message: 'Add a student before a Cove family code is issued.',
      })
    }

    const code = await ensureCoveFamilyCode(session.email)
    const card = resolveFamilyGiftCard(family)
    let balance = card.balance
    if (card.gan) {
      try {
        // Pull live Square balance + backfill any snack/POS redeems into Payments.
        const synced = await syncFamilyCoveRedeems(session.email)
        balance = synced.balance
      } catch {
        try {
          balance = await getGiftCardBalance(card.gan)
        } catch {
          // keep CMS
        }
      }
    }

    const { coveDigitalCardScanPayload } = await import('@/lib/cove-family-code')
    const scanPayload = coveDigitalCardScanPayload({
      gan: card.gan,
      coveFamilyCode: code,
    })

    return NextResponse.json({
      coveFamilyCode: code,
      balance,
      // Masked for display; full GAN only inside scanPayload for Square Stand / Wallet QR
      gan: card.gan ? `${card.gan.slice(0, 4)}…${card.gan.slice(-4)}` : '',
      hasCard: Boolean(card.gan),
      scanPayload,
      /** Raw GAN digits — same as Square Stand gift-card barcode when card is loaded */
      squareScanReady: Boolean(card.gan && scanPayload === card.gan),
    })
  } catch (err) {
    console.error('/api/gift-card/family-code GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load family code' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'reset') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }
    const family = await listFamilyStudents(session.email)
    if (family.length === 0) {
      return NextResponse.json({ error: 'Add a student first' }, { status: 400 })
    }
    const code = await resetCoveFamilyCode(session.email)
    return NextResponse.json({ ok: true, coveFamilyCode: code })
  } catch (err) {
    console.error('/api/gift-card/family-code POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not reset family code' },
      { status: 500 }
    )
  }
}
