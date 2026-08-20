import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCoveFamilyCode,
  getCoveFamilyPasscode,
  resetCoveFamilyCode,
  setCoveFamilyPasscode,
  suggestUniqueCovePasscode,
  validateCovePasscode,
} from '@/lib/cove-family-code'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { getGiftCardBalance, upsertSquareCustomerForCoveStand } from '@/lib/square'
import { syncFamilyCoveRedeems } from '@/lib/cove-redeem-sync'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { getEffectiveParentEmail } from '@/lib/staff/session'

/**
 * GET  /api/gift-card/family-code. Numeric code + word passcode + QR payload
 * POST { action: 'reset' }. Rotate 6-digit backup (primary only)
 * POST { action: 'set-passcode', passcode }. Set spoken word passcode (primary only)
 * POST { action: 'suggest-passcode' }. Name-based suggestion
 *
 * Uses getEffectiveParentEmail so staff with linked personalEmail (or act-as)
 * see the same household as /api/students. Not an empty staff@ mailbox.
 */
export async function GET(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const viewerHousehold = effective.parentEmail.trim().toLowerCase()
    const householdEmail = await resolvePrimaryParentEmail(viewerHousehold)
    const isPrimary = householdEmail === viewerHousehold

    const family = await listFamilyStudents(householdEmail)
    if (family.length === 0) {
      return NextResponse.json({
        coveFamilyCode: null,
        coveFamilyPasscode: null,
        balance: 0,
        gan: '',
        hasCard: false,
        locked: true,
        reason: 'no_students',
        message: 'Add a student first, then you can load money onto your Cove Digital Card.',
      })
    }

    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(householdEmail)
    if (!gate.ok) {
      return NextResponse.json({
        coveFamilyCode: null,
        coveFamilyPasscode: null,
        balance: 0,
        gan: '',
        hasCard: false,
        locked: true,
        reason: 'onboarding',
        message: gate.error,
      })
    }

    const code = await ensureCoveFamilyCode(householdEmail)
    const passcode = await getCoveFamilyPasscode(householdEmail)
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

    const firstName = String(effective.session.member?.contact?.firstName ?? '').trim()
    const lastName = String(effective.session.member?.contact?.lastName ?? '').trim()
    const suggestedPasscode =
      firstName && lastName
        ? await suggestUniqueCovePasscode(householdEmail, lastName, firstName)
        : ''

    // Best-effort: keep Square Customer searchable on Stand (PIN + passcode)
    void upsertSquareCustomerForCoveStand({
      email: householdEmail,
      name: [firstName, lastName].filter(Boolean).join(' ') || householdEmail,
      coveFamilyCode: code,
      coveFamilyPasscode: passcode,
      giftCardId: card.giftCardId,
      gan: card.gan,
    }).catch(() => {})

    return NextResponse.json({
      coveFamilyCode: code,
      coveFamilyPasscode: passcode || null,
      suggestedPasscode: suggestedPasscode || null,
      passcodeRules:
        '6-24 letters or numbers, at least one letter, no spaces. Suggested: last name + first letters of first name.',
      balance,
      gan: card.gan ? `${card.gan.slice(0, 4)}…${card.gan.slice(-4)}` : '',
      hasCard: Boolean(card.gan),
      scanPayload,
      squareScanReady: Boolean(card.gan && scanPayload === card.gan),
      paidMemberCode,
      isPrimary,
      primaryParentEmail: householdEmail,
      parentFirstName: firstName,
      parentLastName: lastName,
      reason: card.gan ? 'ready' : 'needs_load',
      message: card.gan
        ? undefined
        : 'Load money to activate your phone QR for The Cove and Square Stand. Free accounts can use the card anytime after a load. Paid membership is optional.',
      codeHint: paidMemberCode
        ? 'Lagoon/Tide member code (ends in 9). Show this 6-digit code at event food tables for refreshment tickets.'
        : 'Family Cove backup code. Lagoon and Tide member codes end in 9 for event refreshments.',
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
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (effective.actingAs) {
    return NextResponse.json({ error: 'Act-as is read-only for Cove codes.' }, { status: 403 })
  }

  try {
    const viewerHousehold = effective.parentEmail.trim().toLowerCase()
    const householdEmail = await resolvePrimaryParentEmail(viewerHousehold)
    if (householdEmail !== viewerHousehold) {
      return NextResponse.json(
        { error: 'Only the primary account holder can change the family Cove codes.' },
        { status: 403 },
      )
    }
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '').trim()

    const family = await listFamilyStudents(householdEmail)
    if (family.length === 0) {
      return NextResponse.json({ error: 'Add a student first' }, { status: 400 })
    }
    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(householdEmail)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error, code: 'ONBOARDING_INCOMPLETE' }, { status: 403 })
    }

    if (action === 'reset') {
      const code = await resetCoveFamilyCode(householdEmail)
      const passcode = await getCoveFamilyPasscode(householdEmail)
      const card = resolveFamilyGiftCard(family)
      await upsertSquareCustomerForCoveStand({
        email: householdEmail,
        coveFamilyCode: code,
        coveFamilyPasscode: passcode,
        giftCardId: card.giftCardId,
        gan: card.gan,
      })
      return NextResponse.json({ ok: true, coveFamilyCode: code })
    }

    if (action === 'suggest-passcode') {
      const firstName =
        String(body.firstName ?? effective.session.member?.contact?.firstName ?? '').trim()
      const lastName = String(
        body.lastName ?? effective.session.member?.contact?.lastName ?? '',
      ).trim()
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: 'Add your first and last name in My Account to get a suggestion.' },
          { status: 400 },
        )
      }
      const suggested = await suggestUniqueCovePasscode(householdEmail, lastName, firstName)
      return NextResponse.json({ ok: true, suggestedPasscode: suggested })
    }

    if (action === 'set-passcode') {
      const validated = validateCovePasscode(String(body.passcode ?? ''))
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 })
      }
      const passcode = await setCoveFamilyPasscode(householdEmail, validated.passcode)
      const code = await ensureCoveFamilyCode(householdEmail)
      const card = resolveFamilyGiftCard(family)
      await upsertSquareCustomerForCoveStand({
        email: householdEmail,
        coveFamilyCode: code,
        coveFamilyPasscode: passcode,
        giftCardId: card.giftCardId,
        gan: card.gan,
      })
      return NextResponse.json({ ok: true, coveFamilyPasscode: passcode })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err) {
    console.error('/api/gift-card/family-code POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update family code' },
      { status: 500 },
    )
  }
}
