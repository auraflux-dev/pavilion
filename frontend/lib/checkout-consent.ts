/**
 * Checkout consent requirements — legal checkboxes with open/read text.
 * Text is CMS-editable via PageContent rows keyed legal-<slug> (same as /terms).
 */
import { getLegalDoc, type LegalDoc, type LegalDocSlug } from '@/lib/api/legal'
import { getWixClient } from '@/lib/wix-client'

export type CheckoutConsentKind = 'membership' | 'program' | 'store-card' | 'product'

export type ConsentItem = {
  id: string
  slug: LegalDocSlug
  /** Short label next to the checkbox */
  label: string
  required: boolean
  /** 'agree' = must check; 'choice' = yes/no toggle (e.g. photo) */
  mode: 'agree' | 'choice'
}

export type ConsentAck = {
  id: string
  slug: LegalDocSlug
  accepted: boolean
  /** ISO timestamp when parent checked */
  acceptedAt: string
  /** Doc "updated" string at time of accept — audit version */
  docVersion: string
}

const MEMBERSHIP_ITEMS: ConsentItem[] = [
  {
    id: 'membership-terms',
    slug: 'membership-terms',
    label: 'I agree to the Membership Terms, Refund Policy, and Tax Disclosure',
    required: true,
    mode: 'agree',
  },
]

const PROGRAM_ITEMS: ConsentItem[] = [
  {
    id: 'enrichment-waiver',
    slug: 'enrichment-waiver',
    label: 'I agree to the Liability Waiver, Pick-Up Policy, and Code of Conduct',
    required: true,
    mode: 'agree',
  },
  {
    id: 'enrichment-medical',
    slug: 'enrichment-medical',
    label: 'I authorize emergency medical treatment and confirm health information is accurate',
    required: true,
    mode: 'agree',
  },
  {
    id: 'photo-release',
    slug: 'photo-release',
    label: 'I grant permission for photo/media use of my student',
    required: true,
    mode: 'choice',
  },
]

/** Store-card / Cove product purchases don't need enrichment waivers. */
export function consentItemsFor(kind: CheckoutConsentKind): ConsentItem[] {
  if (kind === 'membership') return MEMBERSHIP_ITEMS
  if (kind === 'program') return PROGRAM_ITEMS
  return []
}

export async function loadConsentDocs(kind: CheckoutConsentKind): Promise<
  Array<ConsentItem & { doc: LegalDoc }>
> {
  const items = consentItemsFor(kind)
  const docs = await Promise.all(items.map(async (item) => ({ ...item, doc: await getLegalDoc(item.slug) })))
  return docs
}

export function validateConsentAcks(
  kind: CheckoutConsentKind,
  acks: ConsentAck[] | undefined
): { ok: true; acks: ConsentAck[] } | { ok: false; error: string } {
  const required = consentItemsFor(kind)
  if (required.length === 0) return { ok: true, acks: [] }
  if (!Array.isArray(acks) || acks.length === 0) {
    return { ok: false, error: 'Please review and accept the required terms before paying.' }
  }
  const byId = new Map(acks.map((a) => [a.id, a]))
  for (const item of required) {
    const ack = byId.get(item.id)
    if (!ack) {
      return { ok: false, error: `Please review: ${item.label}` }
    }
    if (item.mode === 'agree' && !ack.accepted) {
      return { ok: false, error: `Please accept: ${item.label}` }
    }
    if (item.mode === 'choice' && typeof ack.accepted !== 'boolean') {
      return { ok: false, error: `Please choose yes or no for photo/media permission.` }
    }
    if (!ack.acceptedAt || !ack.docVersion) {
      return { ok: false, error: 'Consent acknowledgment is incomplete — reopen checkout and try again.' }
    }
  }
  return { ok: true, acks }
}

/** Persist a versioned audit trail of what the parent agreed to. */
export async function recordConsentAcknowledgments(input: {
  parentEmail: string
  kind: CheckoutConsentKind
  transactionId: string
  studentId?: string | null
  programId?: string | null
  acks: ConsentAck[]
}): Promise<void> {
  if (!input.acks.length) return
  const client = getWixClient()
  const now = new Date().toISOString()
  await Promise.all(
    input.acks.map((ack) =>
      client.items.insert('ConsentAcknowledgments', {
        parentEmail: input.parentEmail.trim().toLowerCase(),
        kind: input.kind,
        consentId: ack.id,
        slug: ack.slug,
        accepted: ack.accepted,
        acceptedAt: ack.acceptedAt || now,
        docVersion: ack.docVersion,
        transactionId: input.transactionId,
        studentId: input.studentId ?? '',
        programId: input.programId ?? '',
        createdDate: now,
      })
    )
  )
}
