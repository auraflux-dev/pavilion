/**
 * Persist Square Terminal pairing + pending in-person checkouts (CMS SiteSettings / Payments).
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import { upsertSiteSetting } from '@/lib/staff/cms-catalog'
import { getWixClient } from '@/lib/wix-client'
import type { RegisterLineIn } from '@/lib/staff/cove-register-sale'

const DEVICE_KEY = 'squareTerminalDeviceId'
const DEVICE_CODE_KEY = 'squareTerminalDeviceCodeId'

export async function getSavedTerminalDeviceId(): Promise<string> {
  const fromEnv = String(process.env.SQUARE_TERMINAL_DEVICE_ID ?? '').trim()
  if (fromEnv) return fromEnv
  const settings = await getSiteSettings()
  return settings.get(DEVICE_KEY, '').trim()
}

export async function saveTerminalDeviceId(deviceId: string): Promise<void> {
  await upsertSiteSetting(DEVICE_KEY, deviceId.trim())
}

export async function getSavedTerminalDeviceCodeId(): Promise<string> {
  const settings = await getSiteSettings()
  return settings.get(DEVICE_CODE_KEY, '').trim()
}

export async function saveTerminalDeviceCodeId(id: string): Promise<void> {
  await upsertSiteSetting(DEVICE_CODE_KEY, id.trim())
}

export type PendingTerminalSale = {
  checkoutId: string
  totalDollars: number
  totalCents: number
  lines: RegisterLineIn[]
  code?: string
  parentEmail: string
  coveFamilyCode?: string
  studentId?: string
  guestEmail?: string
  guestPhone?: string
  guestName?: string
  sendJoinInvite?: boolean
}

export async function insertPendingTerminalSale(sale: PendingTerminalSale): Promise<void> {
  const client = getWixClient()
  await client.items.insert('Payments', {
    parentEmail: sale.parentEmail,
    studentId: sale.studentId || undefined,
    amount: sale.totalDollars,
    status: 'Pending Terminal',
    paymentDate: new Date().toISOString(),
    paymentMethod: 'Square Terminal',
    transactionId: sale.checkoutId,
    source: 'cove_register_terminal',
    programName: 'In-person sales',
    notes: JSON.stringify({
      kind: 'terminal_pending',
      lines: sale.lines,
      code: sale.code || null,
      coveFamilyCode: sale.coveFamilyCode || null,
      guestEmail: sale.guestEmail || null,
      guestPhone: sale.guestPhone || null,
      guestName: sale.guestName || null,
      sendJoinInvite: Boolean(sale.sendJoinInvite),
    }),
  })
}

export async function findPendingTerminalSale(checkoutId: string): Promise<{
  paymentId: string
  sale: PendingTerminalSale
  status: string
} | null> {
  const client = getWixClient()
  const result = await client.items
    .query('Payments')
    .eq('transactionId', checkoutId)
    .eq('source', 'cove_register_terminal')
    .limit(1)
    .find()
  const row = result.items?.[0] as
    | {
        _id?: string
        status?: string
        amount?: number
        parentEmail?: string
        studentId?: string
        notes?: string
      }
    | undefined
  if (!row?._id) return null

  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(String(row.notes ?? '{}')) as Record<string, unknown>
  } catch {
    parsed = {}
  }

  const lines = (Array.isArray(parsed.lines) ? parsed.lines : []) as RegisterLineIn[]
  return {
    paymentId: String(row._id),
    status: String(row.status ?? ''),
    sale: {
      checkoutId,
      totalDollars: Number(row.amount) || 0,
      totalCents: Math.round((Number(row.amount) || 0) * 100),
      lines,
      code: parsed.code ? String(parsed.code) : undefined,
      parentEmail: String(row.parentEmail ?? 'guest@register.local'),
      coveFamilyCode: parsed.coveFamilyCode ? String(parsed.coveFamilyCode) : undefined,
      studentId: row.studentId ? String(row.studentId) : undefined,
      guestEmail: parsed.guestEmail ? String(parsed.guestEmail) : undefined,
      guestPhone: parsed.guestPhone ? String(parsed.guestPhone) : undefined,
      guestName: parsed.guestName ? String(parsed.guestName) : undefined,
      sendJoinInvite: Boolean(parsed.sendJoinInvite),
    },
  }
}

export async function markTerminalSalePaid(opts: {
  paymentId: string
  checkoutId: string
  paymentIds: string[]
  lineSummary: string
}): Promise<void> {
  const client = getWixClient()
  const existing = (await client.items.get('Payments', opts.paymentId)) as Record<string, unknown>
  await client.items.update('Payments', {
    ...existing,
    _id: opts.paymentId,
    status: 'Paid',
    paymentMethod: 'Square Terminal',
    transactionId: opts.paymentIds[0] || opts.checkoutId,
    notes: `Terminal checkout ${opts.checkoutId}: ${opts.lineSummary}`,
    paymentDate: new Date().toISOString(),
  } as Parameters<typeof client.items.update>[1])
}

export async function markTerminalSaleCancelled(paymentId: string, checkoutId: string): Promise<void> {
  const client = getWixClient()
  const existing = (await client.items.get('Payments', paymentId)) as Record<string, unknown>
  await client.items.update('Payments', {
    ...existing,
    _id: paymentId,
    status: 'Cancelled',
    notes: `Terminal checkout cancelled (${checkoutId})`,
  } as Parameters<typeof client.items.update>[1])
}
