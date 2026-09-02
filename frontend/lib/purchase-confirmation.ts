/**
 * Post-purchase confirmation email + portal inbox message + next-step copy.
 * Uses Gmail (same Workspace sender as mass email). Failures are logged only.  * checkout still succeeds if mail is unavailable.
 */
import { getWixClient } from '@/lib/wix-client'
import { sendMassEmail } from '@/lib/staff/mass-email'
import { plainTextToEmailHtml } from '@/lib/staff/newsletter-html'
import {
  buildMembershipEntitlements,
  PHYSICAL_PERK_PICKUP_NOTE,
} from '@/lib/membership-entitlements'
import {
  runForCharityReceiptHtmlBlock,
  runForCharityReceiptTextFooter,
  stillShowingRunForCharity,
} from '@/lib/run-for-charity'
import { publicBrandFace, vanillaizeIfDemo } from '@/lib/demo/brand'

export type PurchaseConfirmKind = 'membership' | 'product' | 'store-card' | 'program' | 'event' | 'donation'

export type PurchaseConfirmationInput = {
  kind: PurchaseConfirmKind
  parentEmail: string
  parentName?: string
  amount: number
  description: string
  transactionId: string
  /** e.g. Square Card on File + Cove Digital Card — staff sale alerts */
  paymentMethod?: string
  meta?: Record<string, string>
  /** Extra lines from fulfill (waitlist, balance, etc.) */
  extras?: Record<string, unknown>
  /** Ops resend: email parent/portal only; do not re-blast staff sale alerts. */
  skipStaffNotify?: boolean
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

/** Cove is redeemed via Gift Cards API, so Square card receipts omit it — spell it out here. */
function tenderBreakdownLines(extras?: Record<string, unknown>): string[] {
  if (!extras) return []
  let coveDollars = 0
  let cardDollars = 0
  if (extras.coveCents != null || extras.cardCents != null) {
    coveDollars = (Number(extras.coveCents) || 0) / 100
    cardDollars = (Number(extras.cardCents) || 0) / 100
  } else if (extras.coveCharged != null || extras.remainderDue != null) {
    coveDollars = Number(extras.coveCharged) || 0
    cardDollars = Number(extras.remainderDue) || 0
  }
  if (coveDollars <= 0 && cardDollars <= 0) return []
  const lines = ['How you paid:']
  if (coveDollars > 0) lines.push(`• Cove Digital Card: ${money(coveDollars)}`)
  if (cardDollars > 0) lines.push(`• Card / other: ${money(cardDollars)}`)
  const balRaw = extras.coveNewBalance ?? extras.newBalance
  if (balRaw != null && String(balRaw).trim() !== '') {
    lines.push(`Cove Digital Card balance now: ${money(Number(balRaw))}`)
  }
  lines.push('')
  return lines
}

function withReceiptPromo<T extends { body: string }>(copy: T): T {
  if (!stillShowingRunForCharity()) return copy
  const footer = runForCharityReceiptTextFooter()
  if (!footer) return copy
  return { ...copy, body: `${copy.body}${footer}` }
}

function paintConfirm(
  out: Omit<PurchaseConfirmation, 'emailed'>,
): Omit<PurchaseConfirmation, 'emailed'> {
  return withReceiptPromo({
    subject: vanillaizeIfDemo(out.subject),
    body: vanillaizeIfDemo(out.body),
    nextSteps: out.nextSteps.map((s) => vanillaizeIfDemo(s)),
    portalHref: vanillaizeIfDemo(out.portalHref),
  })
}

export function buildPurchaseConfirmationCopy(
  input: PurchaseConfirmationInput,
): Omit<PurchaseConfirmation, 'emailed'> {
  const brand = publicBrandFace()
  const name = (input.parentName || `${brand.short} family`).trim()
  const baseReceipt = [
    `Hi ${name.split(' ')[0] || 'there'},`,
    '',
    `Thanks for your ${brand.short} purchase.`,
    '',
    `Order: ${input.description}`,
    `Amount: ${money(input.amount)}`,
    `Reference: ${input.transactionId}`,
    '',
    ...tenderBreakdownLines(input.extras),
  ]

  if (input.kind === 'program') {
    const waitlisted = Boolean(input.extras?.waitlisted || input.extras?.status === 'Waitlisted')
    const pos = input.extras?.waitlistPosition
    const programLabel =
      input.meta?.programName ||
      input.description.replace(/^Enrichment:\s*/i, '').trim() ||
      'enrichment program'
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
    return paintConfirm({
      subject: waitlisted
        ? `Waitlisted: ${programLabel}`
        : `Enrolled: ${programLabel}`,
      body: [
        `Hi ${name.split(' ')[0] || 'there'},`,
        '',
        waitlisted
          ? `Thanks for joining the waitlist for ${programLabel}.`
          : `Thanks for enrolling in ${programLabel}.`,
        '',
        `Order: ${input.description}`,
        `Amount: ${money(input.amount)}`,
        `Reference: ${input.transactionId}`,
        '',
        ...tenderBreakdownLines(input.extras),
        'Next steps:',
        ...nextSteps.map((s) => `• ${s}`),
        '',
        `${brand.short} Programs`,
      ].join('\n'),
      nextSteps,
      portalHref: '/member-portal#calendar',
    })
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
    const hasPhysical = ents.some((e) => e.kind === 'spirit_shirt' || e.kind === 'magnet')
    const nextSteps = [
      `Your ${tier} membership is active.`,
      `Open Member Portal for your ${brand.card} credit and member perks.`,
      ...perkLines.map((label) => `Perk: ${label}.`),
      ...(hasPhysical ? [PHYSICAL_PERK_PICKUP_NOTE] : []),
      'Add or update students so enrichment discounts apply correctly.',
    ]
    return paintConfirm({
      subject: `Welcome: ${tier} membership confirmed`,
      body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', `${brand.short} Membership`].join(
        '\n',
      ),
      nextSteps,
      portalHref: '/member-portal',
    })
  }

  if (input.kind === 'store-card') {
    const bal =
      input.extras?.newBalance != null ? money(Number(input.extras.newBalance)) : null
    const nextSteps = [
      bal ? `Family ${brand.card} balance is now ${bal}.` : `Your ${brand.card} load is complete.`,
      `Students can use the 6-digit family code (or QR) at the ${brand.store} window.`,
      `Reload anytime from Member Portal → Store & ${brand.card}.`,
    ]
    return paintConfirm({
      subject: `${brand.card} load confirmed`,
      body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', brand.store].join('\n'),
      nextSteps,
      portalHref: '/member-portal#store',
    })
  }

  if (input.kind === 'event') {
    const title = input.meta?.eventTitle || 'event'
    const qty = input.meta?.quantity || '1'
    const nextSteps = [
      `${qty} ticket${qty === '1' ? '' : 's'} for ${title} is confirmed.`,
      'Add the event to your calendar from the Events page or Member Portal.',
      'Bring this confirmation (email or portal Messages) to check in.',
    ]
    return paintConfirm({
      subject: `Tickets confirmed: ${title}`,
      body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', `${brand.short} Events`].join(
        '\n',
      ),
      nextSteps,
      portalHref: '/events',
    })
  }

  if (input.kind === 'donation') {
    const nextSteps = [
      `Thank you. Your gift supports ${brand.short} enrichment, ${brand.store}, and events.`,
      'A receipt is in Member Portal → Messages (and email when mail is connected).',
      `${brand.short} is a 501(c)(3); consult your tax advisor about deductibility.`,
    ]
    return paintConfirm({
      subject: `Thank you for your ${brand.short} donation`,
      body: [
        ...baseReceipt,
        `Your donation goes to ${brand.short} (not the school district) to support ${brand.school} students.`,
        '',
        'Next steps:',
        ...nextSteps.map((s) => `• ${s}`),
        '',
        brand.short,
      ].join('\n'),
      nextSteps,
      portalHref: '/fundraising#donate',
    })
  }

  const nextSteps = [
    `Order received for ${input.meta?.productName || `your ${brand.store} item`}.`,
    `Spirit wear and online ${brand.store} orders are fulfilled per the product notes (pickup or window).`,
    'Questions? Reply to this email or use Member Portal → Help.',
  ]
  return paintConfirm({
    subject: `Order confirmed: ${input.meta?.productName || brand.store}`,
    body: [...baseReceipt, 'Next steps:', ...nextSteps.map((s) => `• ${s}`), '', brand.store].join('\n'),
    nextSteps,
    portalHref: '/cove',
  })
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
      fromName: publicBrandFace().short,
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
  const copy = buildPurchaseConfirmationCopy(input)
  await insertPortalMessage(input, copy)

  let emailed = false
  try {
    const flyerHtml = runForCharityReceiptHtmlBlock()
    // Strip the plain-text flyer footer from HTML body so the image block is not duplicated as text.
    const bodyForHtml = flyerHtml
      ? copy.body.replace(runForCharityReceiptTextFooter(), '').trimEnd()
      : copy.body
    const result = await sendMassEmail({
      subject: copy.subject,
      body: copy.body,
      html: `${plainTextToEmailHtml(bodyForHtml)}${flyerHtml}`,
      fromName: publicBrandFace().short,
      recipients: [input.parentEmail],
    })
    emailed = result.ok && result.sent > 0
    if (!result.ok) {
      console.warn('[purchase-confirmation] email skipped/failed', result.errors)
    }
  } catch (err) {
    console.warn('[purchase-confirmation] email error', err)
  }

  if (!input.skipStaffNotify) {
    try {
      const { notifyStaffTransaction } = await import('@/lib/staff/submission-notify')
      const staff = await notifyStaffTransaction({
        kind: input.kind,
        parentEmail: input.parentEmail,
        parentName: input.parentName,
        amount: input.amount,
        description: input.description,
        transactionId: input.transactionId,
        paymentMethod: input.paymentMethod,
        meta: input.meta,
        extras: input.extras,
      })
      if (!staff.ok) {
        console.warn('[purchase-confirmation] staff sale alert skipped', staff)
      }
    } catch (err) {
      console.warn('[purchase-confirmation] staff sale alert error', err)
    }
  }

  return { ...copy, emailed }
}
