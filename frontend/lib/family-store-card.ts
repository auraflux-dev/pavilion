/**
 * Cove store card is one Square gift card + one balance per household account number.
 * Login email resolves to A#####; students under every email on that account are included.
 */
import { getWixClient } from '@/lib/wix-client'

export type FamilyStudentCardRow = {
  _id: string
  parentEmail?: string
  firstName?: string
  lastName?: string
  squareGiftCardGan?: string
  squareGiftCardId?: string
  storeCardBalance?: number
  archived?: boolean
}

export async function listFamilyStudents(parentEmail: string): Promise<FamilyStudentCardRow[]> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return []

  let emails = [email]
  try {
    const { resolveHouseholdMembershipContext } = await import(
      '@/lib/staff/membership-account-number'
    )
    const ctx = await resolveHouseholdMembershipContext(email)
    if (ctx.emails.length) emails = ctx.emails
  } catch {
    // Account numbers optional; fall back to viewer email only.
  }

  const client = getWixClient()
  const byId = new Map<string, FamilyStudentCardRow>()
  for (const e of emails) {
    const result = await client.items.query('Students').eq('parentEmail', e).limit(100).find()
    for (const item of (result.items ?? []) as FamilyStudentCardRow[]) {
      if (item.archived === true) continue
      const id = String(item._id ?? '')
      if (id) byId.set(id, item)
      else byId.set(`${e}:${item.firstName}:${item.lastName}`, item)
    }
  }
  return [...byId.values()]
}

/** Prefer an existing GAN already on any sibling in the family. */
export function resolveFamilyGiftCard(students: FamilyStudentCardRow[]): {
  gan: string
  giftCardId: string
  balance: number
  sourceStudentId: string | null
} {
  for (const s of students) {
    const gan = String(s.squareGiftCardGan ?? '').trim()
    if (gan) {
      return {
        gan,
        giftCardId: String(s.squareGiftCardId ?? '').trim(),
        balance: Number(s.storeCardBalance) || 0,
        sourceStudentId: s._id,
      }
    }
  }
  return { gan: '', giftCardId: '', balance: 0, sourceStudentId: null }
}

/** Write the same GAN / id / balance onto every active student for this parent. */
export async function syncFamilyStoreCard(opts: {
  parentEmail: string
  gan: string
  giftCardId?: string
  balanceDollars: number
}): Promise<string[]> {
  const students = await listFamilyStudents(opts.parentEmail)
  const client = getWixClient()
  const updated: string[] = []
  for (const student of students) {
    if (!student._id) continue
    await client.items.update('Students', {
      ...student,
      squareGiftCardGan: opts.gan,
      squareGiftCardId: opts.giftCardId || student.squareGiftCardId || '',
      storeCardBalance: opts.balanceDollars,
    })
    updated.push(student._id)
  }
  try {
    const { ensureCoveFamilyCode } = await import('@/lib/cove-family-code')
    await ensureCoveFamilyCode(opts.parentEmail)
  } catch {
    // code field optional until CMS schema includes coveFamilyCode
  }
  return updated
}

/**
 * True if this family already received store-card credit
 * (membership provision or a successful parent load).
 */
export async function familyHasPriorStoreCardCredit(parentEmail: string): Promise<boolean> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return true
  const students = await listFamilyStudents(email)
  const studentIds = new Set(students.map((s) => s._id).filter(Boolean))
  const client = getWixClient()

  const markers = ['membership_gift_card', 'store_card_reload', 'store_card'] as const
  const countsAsPrior = (source: string) => {
    const s = source.toLowerCase()
    if (s.includes('load_failed') || s.includes('needs_reconciliation')) return false
    return markers.some((m) => s.includes(m))
  }

  try {
    // Parent-scoped membership credit
    const byEmail = await client.items
      .query('Payments')
      .eq('parentEmail', email)
      .eq('status', 'Paid')
      .limit(50)
      .find()
    for (const p of (byEmail.items ?? []) as Array<{ source?: string }>) {
      if (countsAsPrior(String(p.source ?? ''))) return true
    }

    // Student-scoped loads (legacy / reload rows)
    for (const id of studentIds) {
      const byStudent = await client.items
        .query('Payments')
        .eq('studentId', id)
        .eq('status', 'Paid')
        .limit(50)
        .find()
      for (const p of (byStudent.items ?? []) as Array<{ source?: string }>) {
        if (countsAsPrior(String(p.source ?? ''))) return true
      }
    }
    return false
  } catch {
    return true
  }
}
