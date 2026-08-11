import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  ensureCoveFamilyCode,
  getCoveFamilyPasscode,
  resetCoveFamilyCode,
  setCoveFamilyPasscode,
  suggestUniqueCovePasscode,
  validateCovePasscode,
} from '@/lib/cove-family-code'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { getGiftCardBalance } from '@/lib/square'
import { syncFamilyCoveRedeems } from '@/lib/cove-redeem-sync'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'

/**
 * GET  /api/gift-card/family-code — numeric code + word passcode + QR payload
 * POST { action: 'reset' } — rotate 6-digit backup (primary only)
 * POST { action: 'set-passcode', passcode } — set spoken word passcode (primary only)
 * POST { action: 'suggest-passcode' } — name-based suggestion
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
        coveFamilyPasscode: null,
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
        coveFamilyPasscode: null,
        balance: 0,
        gan: '',
        locked: true,
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

    const firstName = String(session.member?.contact?.firstName ?? '').trim()
    const lastName = String(session.member?.contact?.lastName ?? '').trim()
    const suggestedPasscode =
      firstName && lastName
        ? await suggestUniqueCovePasscode(householdEmail, lastName, firstName)
        : ''

    return NextResponse.json({
      coveFamilyCode: code,
      coveFamilyPasscode: passcode || null,
      suggestedPasscode: suggestedPasscode || null,
      passcodeRules:
        '6–24 letters or numbers, at least one letter, no spaces. Suggested: last name + first letters of first name.',
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
      return NextResponse.json({ ok: true, coveFamilyCode: code })
    }

    if (action === 'suggest-passcode') {
      const firstName =
        String(body.firstName ?? session.member?.contact?.firstName ?? '').trim()
      const lastName = String(body.lastName ?? session.member?.contact?.lastName ?? '').trim()
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
