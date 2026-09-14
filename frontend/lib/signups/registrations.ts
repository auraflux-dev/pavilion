import { randomUUID } from 'node:crypto'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { withOrgClient } from '@/lib/crm/tenant'
import type { SignupSheet, SignupRegistration, ClaimSignupInput, ClaimSlotInput } from '@/lib/signups/types'

export type { SignupRegistration, ClaimSignupInput, ClaimSlotInput }

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function parseAnswers(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) out[k] = String(v ?? '')
    return out
  } catch {
    return {}
  }
}

export async function claimSignupSlots(
  orgId: string,
  sheet: SignupSheet,
  input: ClaimSignupInput,
): Promise<{ registrations: SignupRegistration[]; confirmationToken: string }> {
  await ensureCommonsReady()
  if (sheet.status !== 'published') throw new Error('This sign-up sheet is not open')

  const name = String(input.name || '').trim()
  const email = String(input.email || '').trim().toLowerCase()
  const phone = (input.phone || '').trim()
  if (!name) throw new Error('Name is required')
  if (!email || !email.includes('@')) throw new Error('Valid email is required')

  const claims = (input.slots || []).filter((s) => s.slotId)
  if (claims.length === 0) throw new Error('Pick at least one slot')

  const allowMulti = sheet.settings.allowMultipleSlotsPerPerson !== false
  if (!allowMulti && claims.length > 1) {
    throw new Error('Only one slot per person on this sheet')
  }

  const staffIdentity = sheet.settings.requireStaffIdentity === true
  for (const field of sheet.fields) {
    if (!field.required) continue
    if (field.fieldKey === 'name' || field.fieldKey === 'email') continue
    if (field.fieldKey === 'phone') {
      if (!staffIdentity && !phone) throw new Error(`${field.label} is required`)
      continue
    }
    const val = String(input.customAnswers?.[field.fieldKey] ?? '').trim()
    if (!val) throw new Error(`${field.label} is required`)
  }

  const confirmationToken = randomUUID().replace(/-/g, '')
  const customJson = JSON.stringify(input.customAnswers || {})
  const created: SignupRegistration[] = []

  await withOrgClient(orgId, async (client) => {
    for (const claim of claims) {
      const qty = Math.max(1, Number(claim.quantity) || 1)
      const slotRes = await client.query<{
        id: string
        title: string
        quantity_needed: number
        quantity_claimed: number
      }>(
        `select id, title, quantity_needed, quantity_claimed
           from signup_slots
          where id = $1 and sheet_id = $2
          for update`,
        [claim.slotId, sheet.id],
      )
      const slot = slotRes.rows[0]
      if (!slot) throw new Error('Slot not found')
      const remaining = slot.quantity_needed - slot.quantity_claimed
      if (qty > remaining) {
        throw new Error(
          remaining <= 0
            ? `“${slot.title}” is full`
            : `Only ${remaining} left for “${slot.title}”`,
        )
      }

      const regId = newId('sr')
      await client.query(
        `insert into signup_registrations (
           id, organization_id, sheet_id, slot_id,
           participant_name, participant_email, participant_phone,
           custom_answers_json, quantity, confirmation_token
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          regId,
          orgId,
          sheet.id,
          slot.id,
          name,
          email,
          phone,
          customJson,
          qty,
          confirmationToken,
        ],
      )
      await client.query(
        `update signup_slots
            set quantity_claimed = quantity_claimed + $1
          where id = $2`,
        [qty, slot.id],
      )
      created.push({
        id: regId,
        sheetId: sheet.id,
        slotId: slot.id,
        slotTitle: slot.title,
        participantName: name,
        participantEmail: email,
        participantPhone: phone,
        customAnswers: input.customAnswers || {},
        quantity: qty,
        confirmationToken,
        createdAt: new Date().toISOString(),
      })
    }
  })

  return { registrations: created, confirmationToken }
}

export async function listRegistrationsForSheet(
  orgId: string,
  sheetId: string,
): Promise<SignupRegistration[]> {
  await ensureCommonsReady()
  const { sqlForOrg } = await import('@/lib/crm/tenant')
  const found = await sqlForOrg<{
    id: string
    sheet_id: string
    slot_id: string
    slot_title: string
    participant_name: string
    participant_email: string
    participant_phone: string
    custom_answers_json: string
    quantity: number
    confirmation_token: string
    created_at: Date
  }>(
    orgId,
    `select r.*, s.title as slot_title
       from signup_registrations r
       join signup_slots s on s.id = r.slot_id
      where r.sheet_id = $1 and r.cancelled_at is null
      order by r.created_at desc`,
    [sheetId],
  )
  return found.rows.map((row) => ({
    id: row.id,
    sheetId: row.sheet_id,
    slotId: row.slot_id,
    slotTitle: row.slot_title,
    participantName: row.participant_name,
    participantEmail: row.participant_email,
    participantPhone: row.participant_phone,
    customAnswers: parseAnswers(row.custom_answers_json),
    quantity: row.quantity,
    confirmationToken: row.confirmation_token,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function getRegistrationsByToken(
  orgId: string,
  sheetId: string,
  token: string,
): Promise<SignupRegistration[]> {
  await ensureCommonsReady()
  const { sqlForOrg } = await import('@/lib/crm/tenant')
  const found = await sqlForOrg<{
    id: string
    sheet_id: string
    slot_id: string
    slot_title: string
    participant_name: string
    participant_email: string
    participant_phone: string
    custom_answers_json: string
    quantity: number
    confirmation_token: string
    created_at: Date
  }>(
    orgId,
    `select r.*, s.title as slot_title
       from signup_registrations r
       join signup_slots s on s.id = r.slot_id
      where r.sheet_id = $1
        and r.confirmation_token = $2
        and r.cancelled_at is null
      order by r.created_at`,
    [sheetId, token.trim()],
  )
  return found.rows.map((row) => ({
    id: row.id,
    sheetId: row.sheet_id,
    slotId: row.slot_id,
    slotTitle: row.slot_title,
    participantName: row.participant_name,
    participantEmail: row.participant_email,
    participantPhone: row.participant_phone,
    customAnswers: parseAnswers(row.custom_answers_json),
    quantity: row.quantity,
    confirmationToken: row.confirmation_token,
    createdAt: row.created_at.toISOString(),
  }))
}

/** Active claimants grouped by slot for public transparency. */
export async function listClaimantsBySheet(
  orgId: string,
  sheetId: string,
): Promise<Map<string, { registrationId: string; name: string; email: string }[]>> {
  await ensureCommonsReady()
  const { sqlForOrg } = await import('@/lib/crm/tenant')
  const found = await sqlForOrg<{
    id: string
    slot_id: string
    participant_name: string
    participant_email: string
  }>(
    orgId,
    `select id, slot_id, participant_name, participant_email
       from signup_registrations
      where sheet_id = $1 and cancelled_at is null
      order by created_at`,
    [sheetId],
  )
  const bySlot = new Map<string, { registrationId: string; name: string; email: string }[]>()
  for (const row of found.rows) {
    const list = bySlot.get(row.slot_id) || []
    list.push({
      registrationId: row.id,
      name: String(row.participant_name || '').trim() || 'Board member',
      email: String(row.participant_email || '').trim().toLowerCase(),
    })
    bySlot.set(row.slot_id, list)
  }
  return bySlot
}

/** Soft-cancel a registration owned by the given email (or any staff cancelling their own). */
export async function cancelSignupRegistration(
  orgId: string,
  sheetId: string,
  registrationId: string,
  participantEmail: string,
): Promise<{ slotId: string; quantity: number }> {
  await ensureCommonsReady()
  const email = participantEmail.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('Email is required to cancel')

  let slotId = ''
  let quantity = 0

  await withOrgClient(orgId, async (client) => {
    const found = await client.query<{
      id: string
      slot_id: string
      quantity: number
      participant_email: string
      cancelled_at: Date | null
    }>(
      `select id, slot_id, quantity, participant_email, cancelled_at
         from signup_registrations
        where id = $1 and sheet_id = $2
        for update`,
      [registrationId, sheetId],
    )
    const row = found.rows[0]
    if (!row) throw new Error('Sign-up not found')
    if (row.cancelled_at) throw new Error('Already cancelled')
    if (String(row.participant_email || '').trim().toLowerCase() !== email) {
      throw new Error('That sign-up belongs to a different email')
    }

    await client.query(
      `update signup_registrations
          set cancelled_at = now(), updated_at = now()
        where id = $1`,
      [registrationId],
    )
    await client.query(
      `update signup_slots
          set quantity_claimed = greatest(0, quantity_claimed - $1)
        where id = $2`,
      [row.quantity, row.slot_id],
    )
    slotId = row.slot_id
    quantity = row.quantity
  })

  return { slotId, quantity }
}
