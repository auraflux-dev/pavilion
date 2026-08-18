/**
 * Post-purchase confirmation email + portal inbox message + next-step copy.
 * Uses Gmail (same Workspace sender as mass email). Failures are logged only.  * checkout still succeeds if mail is unavailable.
 */
import { getWixClient } from '@/lib/wix-client'
import { sendMassEmail } from '@/lib/staff/mass-email'
import { buildMembershipEntitlements } from '@/lib/membership-entitlements'

export type PurchaseConfirmKind = 'membership' | 'product' | 'store-card' | 'program' | 'event' | 'donation'

export type PurchaseConfirmationInput = {
  kind: PurchaseConfirmKind
  parentEmail: string
  parentName?: string
  amount: number
  description: string
  transactionId: string
  meta?: Record<string, string>
  /** Extra lines from fulfill (waitlist, balance, etc.) */
  extras?: Record<string, unknown>
}

export type PurchaseConfirmation = {
  subject: string
  body: string
  nextSteps: string[]
  portalHref: string
  emailed: boolean
}

function money(n: number) {
  return `$${Number(n).toFixed(2)}`
}

function buildCopy(input: PurchaseConfirmationInput): Omit<PurchaseConfirmation, 'emailed'> {
  const name = (input.parentName || 'SHMS PTO family').trim()
  const baseReceipt = [
    `Hi ${name.split(' ')[0] || 'there'},`,
    '',
    `Thanks for your SHMS PTO purchase.`,
    '',
    `Order: ${input.description}`,
    `Amount: ${money(input.amount)}`,
    `Reference: ${input.transactionId}`,
    '',
  ]

  if (input.kind === 'program') {
    const waitlisted = Boolean(input.extras?.waitlisted || input.extras?.status === 'Waitlisted')
    const pos = input.extras?.waitlistPosition
    const nextSteps = waitlisted
      ? [
          `You are on the waitlist${pos ? ` (#${pos})` : ''}. We will email you if a seat opens.`,
          'Check schedule and messages anytime in Member Portal → Calendar & Messages.',
          'Keep allergies and emergency contacts up to date on your student profile.',
        ]
      : [
          'Your seat is confirmed. Class day/time appear in Member Portal → Calendar.',
          'Watch Messages for instructor updates and flyers.',
          'Keep allergies and emergency contacts up to date on your student profile.',
        ]
    return {
      subject: waitlisted
 ? `Waitlisted: ${input.meta?.programName || 'enrichment program'}`
 : `Enrolled: ${input.meta?.programName || 'enrichment program'}`,
 body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', 'SHMS PTO Programs'].join(
        '\n',
      ),
      nextSteps,
      portalHref: '/member-portal#calendar',
    }
  }

  if (input.kind === 'membership') {
    const tier = input.meta?.tierName || input.meta?.tier || 'paid'
    const ents = buildMembershipEntitlements({
      tier: String(input.meta?.tier || input.meta?.tierName || ''),
      shirtSize: input.meta?.shirtSize || null,
    })
    const perkLines = ents
      .filter((e) => e.kind !== 'cove_credit')
      .map((e) => e.label)
    const nextSteps = [
      `Your ${tier} membership is active.`,
      'Open Member Portal for your Cove Digital Card credit and member perks.',
      ...perkLines.map((label) => `Perk: ${label}.`),
      'Add or update students so enrichment discounts apply correctly.',
    ]
    return {
      subject: `Welcome: ${tier} membership confirmed`,
      body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', 'SHMS PTO Membership'].join(
        '\n',
      ),
      nextSteps,
      portalHref: '/member-portal',
    }
  }

  if (input.kind === 'store-card') {
    const bal =
      input.extras?.newBalance != null ? money(Number(input.extras.newBalance)) : null
    const nextSteps = [
      bal ? `Family Cove Digital Card balance is now ${bal}.` : 'Your Cove Digital Card load is complete.',
      'Students can use the 6-digit Family Cove code (or QR) at The Cove window.',
      'Reload anytime from Member Portal → Store & Cove Digital Card.',
    ]
    return {
      subject: 'Cove Digital Card load confirmed',
 body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', 'The Cove'].join('\n'),
      nextSteps,
      portalHref: '/member-portal#store',
    }
  }

  if (input.kind === 'event') {
    const title = input.meta?.eventTitle || 'event'
    const qty = input.meta?.quantity || '1'
    const nextSteps = [
 `${qty} ticket${qty === '1' ? '' : 's'} for ${title} is confirmed.`,
      'Add the event to your calendar from the Events page or Member Portal.',
      'Bring this confirmation (email or portal Messages) to check in.',
    ]
    return {
 subject: `Tickets confirmed: ${title}`,
 body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', 'SHMS PTO Events'].join(
        '\n',
      ),
      nextSteps,
      portalHref: '/events',
    }
  }

  if (input.kind === 'donation') {
    const nextSteps = [
 'Thank you. Your gift supports SHMS PTO enrichment, The Cove, and events.',
      'A receipt is in Member Portal → Messages (and email when mail is connected).',
      'SHMS PTO is a 501(c)(3); consult your tax advisor about deductibility.',
    ]
    return {
      subject: 'Thank you for your SHMS PTO donation',
      body: [
        ...baseReceipt,
        'Your donation goes to SHMS PTO (not the school district) to support Stone Hill students.',
        '',
        'Next steps:',
        ...nextSteps.map((s) => `• ${s}`),
        '',
 'SHMS PTO',
      ].join('\n'),
      nextSteps,
      portalHref: '/fundraising#donate',
    }
  }

  // product / Cove online
  const nextSteps = [
    `Order received for ${input.meta?.productName || 'your Cove item'}.`,
    'Spirit wear and online Cove orders are fulfilled per the product notes (pickup or window).',
    'Questions? Reply to this email or use Member Portal → Help.',
  ]
  return {
 subject: `Order confirmed: ${input.meta?.productName || 'The Cove'}`,
 body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', 'The Cove'].join('\n'),
    nextSteps,
    portalHref: '/cove',
  }
}

async function insertPortalMessage(input: PurchaseConfirmationInput, copy: Omit<PurchaseConfirmation, 'emailed'>) {
  try {
    const client = getWixClient()
    await client.items.insert('ParentMessages', {
      parentEmail: input.parentEmail.trim().toLowerCase(),
      audience: 'family',
      grade: null,
      studentId: input.meta?.studentId || null,
      studentName: null,
      programName: input.meta?.programName || input.meta?.eventTitle || input.meta?.productName || '',
      fromName: 'SHMS PTO',
      subject: copy.subject,
      body: copy.body,
      sentAt: new Date().toISOString(),
      active: true,
    })
  } catch (err) {
    console.warn('[purchase-confirmation] ParentMessages insert failed', err)
  }
}

export async function sendPurchaseConfirmation(
  input: PurchaseConfirmationInput,
): Promise<PurchaseConfirmation> {
  const copy = buildCopy(input)
  await insertPortalMessage(input, copy)

  let emailed = false
  try {
    const result = await sendMassEmail({
      subject: copy.subject,
      body: copy.body,
      fromName: 'SHMS PTO',
      recipients: [input.parentEmail],
    })
    emailed = result.ok && result.sent > 0
    if (!result.ok) {
      console.warn('[purchase-confirmation] email skipped/failed', result.errors)
    }
  } catch (err) {
    console.warn('[purchase-confirmation] email error', err)
  }

  try {
    const { notifyStaffTransaction } = await import('@/lib/staff/submission-notify')
    const staff = await notifyStaffTransaction({
      kind: input.kind,
      parentEmail: input.parentEmail,
      parentName: input.parentName,
      amount: input.amount,
      description: input.description,
      transactionId: input.transactionId,
      meta: input.meta,
    })
    if (!staff.ok) {
      console.warn('[purchase-confirmation] staff sale alert skipped', staff)
    }
  } catch (err) {
    console.warn('[purchase-confirmation] staff sale alert error', err)
  }

  return { ...copy, emailed }
}
