/**
 * Family Cove window code. short PIN students recite at The Cove.
 * Stored on Memberships (parent) and mirrored on Students.
 */
import { getWixClient } from '@/lib/wix-client'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  type FamilyStudentCardRow,
} from '@/lib/family-store-card'
import { getGiftCardBalance } from '@/lib/square'

export type CoveFamilyLookup = {
  parentEmail: string
  coveFamilyCode: string
  gan: string
  balance: number
  students: Array<{ id: string; firstName: string; lastName: string; grade?: string }>
}

function normalizeCode(raw: string): string {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 8)
}

function randomCode(): string {
  // 6 digits, avoid leading zeros for easier verbal share
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function codeTaken(code: string, exceptEmail?: string): Promise<boolean> {
  const client = getWixClient()
  const email = exceptEmail?.trim().toLowerCase()
  try {
    const byMembership = await client.items
      .query('Memberships')
      .eq('coveFamilyCode', code)
      .limit(5)
      .find()
    for (const row of (byMembership.items ?? []) as Array<{ email?: string }>) {
      const e = String(row.email ?? '')
        .trim()
        .toLowerCase()
      if (e && e !== email) return true
    }
  } catch {
    // field/collection may be new
  }
  try {
    const byStudent = await client.items
      .query('Students')
      .eq('coveFamilyCode', code)
      .limit(20)
      .find()
    for (const row of (byStudent.items ?? []) as Array<{ parentEmail?: string }>) {
      const e = String(row.parentEmail ?? '')
        .trim()
        .toLowerCase()
      if (e && e !== email) return true
    }
  } catch {
    // ignore
  }
  return false
}

async function upsertMembershipCode(email: string, code: string): Promise<void> {
  const client = getWixClient()
  try {
    const existing = await client.items.query('Memberships').eq('email', email).limit(1).find()
    const row = existing.items?.[0] as Record<string, unknown> | undefined
    if (row?._id) {
      await client.items.update('Memberships', {
        ...(row as object),
        _id: String(row._id),
        email,
        coveFamilyCode: code,
      } as Parameters<typeof client.items.update>[1])
    } else {
      await client.items.insert('Memberships', {
        email,
        coveFamilyCode: code,
        status: 'active',
        tier: 'free',
      } as Parameters<typeof client.items.insert>[1])
    }
  } catch (err) {
    console.warn('Memberships coveFamilyCode upsert failed:', err)
  }
}

async function mirrorCodeOnStudents(email: string, code: string): Promise<void> {
  const students = await listFamilyStudents(email)
  const client = getWixClient()
  for (const student of students) {
    if (!student._id) continue
    try {
      await client.items.update('Students', {
        ...student,
        coveFamilyCode: code,
      } as Parameters<typeof client.items.update>[1])
    } catch {
 // field may not exist yet on schema. ignore
    }
  }
}

/** Return existing code or create a unique one for the family. */
export async function ensureCoveFamilyCode(parentEmail: string): Promise<string> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) throw new Error('parentEmail required')

  const client = getWixClient()
  try {
    const membership = await client.items.query('Memberships').eq('email', email).limit(1).find()
    const row = membership.items?.[0] as { coveFamilyCode?: string } | undefined
    const existing = normalizeCode(String(row?.coveFamilyCode ?? ''))
    if (existing.length >= 4) {
      await mirrorCodeOnStudents(email, existing)
      return existing
    }
  } catch {
    // continue
  }

  const students = await listFamilyStudents(email)
  for (const s of students as Array<FamilyStudentCardRow & { coveFamilyCode?: string }>) {
    const existing = normalizeCode(String(s.coveFamilyCode ?? ''))
    if (existing.length >= 4) {
      await upsertMembershipCode(email, existing)
      await mirrorCodeOnStudents(email, existing)
      return existing
    }
  }

  let code = randomCode()
  for (let i = 0; i < 12; i++) {
    if (!(await codeTaken(code, email))) break
    code = randomCode()
  }

  await upsertMembershipCode(email, code)
  await mirrorCodeOnStudents(email, code)
  return code
}

export async function resetCoveFamilyCode(parentEmail: string): Promise<string> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) throw new Error('parentEmail required')

  let code = randomCode()
  for (let i = 0; i < 12; i++) {
    if (!(await codeTaken(code, email))) break
    code = randomCode()
  }
  await upsertMembershipCode(email, code)
  await mirrorCodeOnStudents(email, code)
  return code
}

/**
 * Lookup by short family PIN (4 to 8 digits) or Square gift-card GAN (raw digits in QR).
 * Square Stand / iPad scans encode the GAN only. no SHMSCOVE: prefix.
 */
export async function lookupFamilyByCoveCode(rawCode: string): Promise<CoveFamilyLookup | null> {
  const digits = String(rawCode ?? '').replace(/\D/g, '')
  if (digits.length < 4) return null

  const client = getWixClient()
  let parentEmail = ''
  let matchedCode = ''

  // Long numeric → Square GAN on a student row (Wallet / Photos QR / Stand scan)
  if (digits.length >= 12) {
    try {
      const byGan = await client.items
        .query('Students')
        .eq('squareGiftCardGan', digits)
        .limit(20)
        .find()
      const first = (byGan.items ?? [])[0] as { parentEmail?: string } | undefined
      parentEmail = String(first?.parentEmail ?? '')
        .trim()
        .toLowerCase()
    } catch {
      // fall through
    }
  }

  const code = normalizeCode(digits.length <= 8 ? digits : '')
  if (!parentEmail && code.length >= 4) {
    try {
      const membership = await client.items
        .query('Memberships')
        .eq('coveFamilyCode', code)
        .limit(1)
        .find()
      const row = membership.items?.[0] as { email?: string } | undefined
      parentEmail = String(row?.email ?? '')
        .trim()
        .toLowerCase()
      if (parentEmail) matchedCode = code
    } catch {
      // fall through to Students
    }

    if (!parentEmail) {
      try {
        const students = await client.items
          .query('Students')
          .eq('coveFamilyCode', code)
          .limit(20)
          .find()
        const first = (students.items ?? [])[0] as { parentEmail?: string } | undefined
        parentEmail = String(first?.parentEmail ?? '')
          .trim()
          .toLowerCase()
        if (parentEmail) matchedCode = code
      } catch {
        return null
      }
    }
  }

  if (!parentEmail) return null

  const family = await listFamilyStudents(parentEmail)
  const card = resolveFamilyGiftCard(family)
  let balance = card.balance
  if (card.gan) {
    try {
      balance = await getGiftCardBalance(card.gan)
    } catch {
      // keep CMS balance
    }
  }

  let coveFamilyCode = matchedCode
  if (!coveFamilyCode) {
    try {
      coveFamilyCode = await ensureCoveFamilyCode(parentEmail)
    } catch {
      coveFamilyCode = ''
    }
  }

  return {
    parentEmail,
    coveFamilyCode,
    gan: card.gan || (digits.length >= 12 ? digits : ''),
    balance,
    students: family.map((s) => ({
      id: s._id,
      firstName: String(s.firstName ?? ''),
      lastName: String(s.lastName ?? ''),
    })),
  }
}

/** QR / Wallet barcode value for Square Stand + Cove: raw GAN when loaded, else family PIN prefix. */
export function coveDigitalCardScanPayload(opts: {
  gan?: string | null
  coveFamilyCode?: string | null
}): string {
  const gan = String(opts.gan ?? '').replace(/\D/g, '')
  if (gan.length >= 12) return gan
  const code = String(opts.coveFamilyCode ?? '').replace(/\D/g, '')
  if (code.length >= 4) return `SHMSCOVE:${code}`
  return ''
}
