import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  ensureCoveFamilyCode,
  resetCoveFamilyCode,
} from '@/lib/cove-family-code'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { getGiftCardBalance } from '@/lib/square'
import { syncFamilyCoveRedeems } from '@/lib/cove-redeem-sync'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'

/**
 * GET  /api/gift-card/family-code. ensure + return family Cove window code
 * POST /api/gift-card/family-code { action: 'reset' }. rotate code (primary only)
 * Co-parents see the primary parent's household code/balance.
 */
export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const householdEmail = await resolvePrimaryParentEmail(session.email)
    const isPrimary = householdEmail === session.email.trim().toLowerCase()

    const family = await listFamilyStudents(householdEmail)
    if (family.length === 0) {
      return NextResponse.json({
        coveFamilyCode: null,
        balance: 0,
        gan: '',
        locked: true,
        message: 'Add a student before a Cove family code is issued.',
      })
    }

    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(householdEmail)
    if (!gate.ok) {
      return NextResponse.json({
        coveFamilyCode: null,
        balance: 0,
        gan: '',
        locked: true,
        message: gate.error,
      })
    }

    const code = await ensureCoveFamilyCode(householdEmail)
    const card = resolveFamilyGiftCard(family)
    let balance = card.balance
    if (card.gan) {
      try {
        const synced = await syncFamilyCoveRedeems(householdEmail)
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

    const { isPaidMemberFamilyCode } = await import('@/lib/cove-family-code')
    const paidMemberCode = isPaidMemberFamilyCode(code)

    return NextResponse.json({
      coveFamilyCode: code,
      balance,
      gan: card.gan ? `${card.gan.slice(0, 4)}…${card.gan.slice(-4)}` : '',
      hasCard: Boolean(card.gan),
      scanPayload,
      squareScanReady: Boolean(card.gan && scanPayload === card.gan),
      paidMemberCode,
      isPrimary,
      primaryParentEmail: householdEmail,
      codeHint: paidMemberCode
        ? 'Paid PTO member code (ends in 9). Show this 6-digit code at event food tables for refreshment tickets.'
        : 'Free-account Cove code. Paid membership codes end in 9 for event refreshments.',
    })
  } catch (err) {
    console.error('/api/gift-card/family-code GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load family code' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const householdEmail = await resolvePrimaryParentEmail(session.email)
    if (householdEmail !== session.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the primary parent can reset the family Cove code.' },
        { status: 403 },
      )
    }
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'reset') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }
    const family = await listFamilyStudents(householdEmail)
    if (family.length === 0) {
      return NextResponse.json({ error: 'Add a student first' }, { status: 400 })
    }
    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(householdEmail)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error, code: 'ONBOARDING_INCOMPLETE' }, { status: 403 })
    }
    const code = await resetCoveFamilyCode(householdEmail)
    return NextResponse.json({ ok: true, coveFamilyCode: code })
  } catch (err) {
    console.error('/api/gift-card/family-code POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not reset family code' },
      { status: 500 },
    )
  }
}
