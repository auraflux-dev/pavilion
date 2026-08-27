import { randomUUID } from 'node:crypto'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { sql } from '@/lib/crm/db'
import { sqlForOrg, withOrgClient } from '@/lib/crm/tenant'
import { slugifySignupTitle, signupPublicPath } from '@/lib/signups/slug'
import type {
  CreateSignupSheetInput,
  SignupFieldType,
  SignupSheet,
  SignupSheetField,
  SignupSheetFieldInput,
  SignupSheetSettings,
  SignupSheetStatus,
  SignupSheetSummary,
  SignupSlot,
  SignupSlotInput,
  SignupSlotType,
} from '@/lib/signups/types'

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function fieldKeyFromLabel(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || `field_${index + 1}`
}

function parseSettings(raw: string | null | undefined): SignupSheetSettings {
  try {
    return JSON.parse(raw || '{}') as SignupSheetSettings
  } catch {
    return {}
  }
}

function parseOptions(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function rowToField(row: {
  id: string
  sheet_id: string
  field_key: string
  label: string
  field_type: string
  required: boolean
  options_json: string
  sort_order: number
}): SignupSheetField {
  return {
    id: row.id,
    sheetId: row.sheet_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type as SignupFieldType,
    required: row.required,
    options: parseOptions(row.options_json),
    sortOrder: row.sort_order,
  }
}

function rowToSlot(row: {
  id: string
  sheet_id: string
  slot_type: string
  title: string
  description: string
  starts_at: Date | null
  ends_at: Date | null
  quantity_needed: number
  quantity_claimed: number
  item_unit: string
  sort_order: number
}): SignupSlot {
  return {
    id: row.id,
    sheetId: row.sheet_id,
    slotType: row.slot_type as SignupSlotType,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at ? row.starts_at.toISOString() : null,
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
    quantityNeeded: row.quantity_needed,
    quantityClaimed: row.quantity_claimed,
    itemUnit: row.item_unit,
    sortOrder: row.sort_order,
  }
}

async function uniqueSlug(orgId: string, desired: string): Promise<string> {
  let slug = slugifySignupTitle(desired)
  for (let i = 0; i < 20; i += 1) {
    const found = await sqlForOrg<{ id: string }>(
      orgId,
      `select id from signup_sheets where slug = $1 limit 1`,
      [slug],
    )
    if (!found.rows[0]) return slug
    slug = `${slugifySignupTitle(desired)}-${i + 2}`
  }
  return `${slugifySignupTitle(desired)}-${randomUUID().slice(0, 6)}`
}

function defaultFields(): SignupSheetFieldInput[] {
  return [
    { label: 'Name', fieldType: 'text', required: true, fieldKey: 'name' },
    { label: 'Email', fieldType: 'email', required: true, fieldKey: 'email' },
    { label: 'Phone', fieldType: 'phone', required: false, fieldKey: 'phone' },
  ]
}

export async function createSignupSheet(
  orgId: string,
  input: CreateSignupSheetInput,
  createdByEmail: string,
): Promise<SignupSheet> {
  await ensureCommonsReady()
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')

  const sheetId = newId('ss')
  const slug = await uniqueSlug(orgId, input.slug?.trim() || title)
  const status: SignupSheetStatus = input.status || 'draft'
  const fields = (input.fields?.length ? input.fields : defaultFields()).map((f, i) => ({
    ...f,
    fieldKey: f.fieldKey || fieldKeyFromLabel(f.label, i),
    fieldType: f.fieldType || 'text',
    sortOrder: f.sortOrder ?? i,
  }))
  const slots = (input.slots || []).map((s, i) => ({
    ...s,
    slotType: s.slotType || 'quantity',
    sortOrder: s.sortOrder ?? i,
  }))

  if (slots.length === 0) {
    throw new Error('Add at least one slot or item for people to sign up for')
  }

  await withOrgClient(orgId, async (client) => {
    await client.query(
      `insert into signup_sheets (
         id, organization_id, slug, title, description, location,
         starts_at, ends_at, timezone, status, settings_json, created_by_email
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        sheetId,
        orgId,
        slug,
        title,
        (input.description || '').trim(),
        (input.location || '').trim(),
        input.startsAt || null,
        input.endsAt || null,
        input.timezone || 'America/New_York',
        status,
        JSON.stringify(input.settings || {}),
        createdByEmail,
      ],
    )

    for (const field of fields) {
      await client.query(
        `insert into signup_sheet_fields (
           id, organization_id, sheet_id, field_key, label, field_type, required, options_json, sort_order
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          newId('sf'),
          orgId,
          sheetId,
          field.fieldKey!,
          field.label.trim(),
          field.fieldType,
          Boolean(field.required),
          JSON.stringify(field.options || []),
          field.sortOrder ?? 0,
        ],
      )
    }

    for (const slot of slots) {
      const qty = Math.max(1, Number(slot.quantityNeeded) || 1)
      await client.query(
        `insert into signup_slots (
           id, organization_id, sheet_id, slot_type, title, description,
           starts_at, ends_at, quantity_needed, item_unit, sort_order
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          newId('sl'),
          orgId,
          sheetId,
          slot.slotType,
          slot.title.trim(),
          (slot.description || '').trim(),
          slot.startsAt || null,
          slot.endsAt || null,
          qty,
          (slot.itemUnit || '').trim(),
          slot.sortOrder ?? 0,
        ],
      )
    }
  })

  const sheet = await getSignupSheetById(orgId, sheetId)
  if (!sheet) throw new Error('Could not load created sign-up sheet')
  return sheet
}

export async function listSignupSheets(orgId: string): Promise<SignupSheetSummary[]> {
  await ensureCommonsReady()
  const found = await sqlForOrg<{
    id: string
    slug: string
    title: string
    location: string
    starts_at: Date | null
    ends_at: Date | null
    status: string
    updated_at: Date
    slot_count: string
    registration_count: string
  }>(
    orgId,
    `select s.id, s.slug, s.title, s.location, s.starts_at, s.ends_at, s.status, s.updated_at,
            count(distinct sl.id)::text as slot_count,
            count(distinct r.id) filter (where r.cancelled_at is null)::text as registration_count
       from signup_sheets s
       left join signup_slots sl on sl.sheet_id = s.id
       left join signup_registrations r on r.sheet_id = s.id
      where s.organization_id = $1
      group by s.id
      order by s.updated_at desc`,
    [orgId],
  )
  return found.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: row.location,
    startsAt: row.starts_at ? row.starts_at.toISOString() : null,
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
    status: row.status as SignupSheetStatus,
    updatedAt: row.updated_at.toISOString(),
    publicPath: signupPublicPath(row.slug),
    slotCount: Number(row.slot_count) || 0,
    registrationCount: Number(row.registration_count) || 0,
  }))
}

export async function getSignupSheetById(orgId: string, sheetId: string): Promise<SignupSheet | null> {
  await ensureCommonsReady()
  const found = await sqlForOrg<{
    id: string
    organization_id: string
    slug: string
    title: string
    description: string
    location: string
    starts_at: Date | null
    ends_at: Date | null
    timezone: string
    status: string
    settings_json: string
    created_by_email: string
    created_at: Date
    updated_at: Date
  }>(orgId, `select * from signup_sheets where id = $1 limit 1`, [sheetId])
  const row = found.rows[0]
  if (!row) return null

  const [fieldsRes, slotsRes] = await Promise.all([
    sqlForOrg(orgId, `select * from signup_sheet_fields where sheet_id = $1 order by sort_order`, [
      sheetId,
    ]),
    sqlForOrg(orgId, `select * from signup_slots where sheet_id = $1 order by sort_order`, [sheetId]),
  ])

  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at ? row.starts_at.toISOString() : null,
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
    timezone: row.timezone,
    status: row.status as SignupSheetStatus,
    settings: parseSettings(row.settings_json),
    createdByEmail: row.created_by_email,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    publicPath: signupPublicPath(row.slug),
    fields: fieldsRes.rows.map((r) => rowToField(r as Parameters<typeof rowToField>[0])),
    slots: slotsRes.rows.map((r) => rowToSlot(r as Parameters<typeof rowToSlot>[0])),
  }
}

export async function getPublishedSignupSheetBySlug(
  orgId: string,
  slug: string,
): Promise<SignupSheet | null> {
  await ensureCommonsReady()
  const found = await sqlForOrg<{ id: string }>(
    orgId,
    `select id from signup_sheets where slug = $1 and status = 'published' limit 1`,
    [slug.trim()],
  )
  const id = found.rows[0]?.id
  if (!id) return null
  return getSignupSheetById(orgId, id)
}

/** Public link on shared product host when Host does not resolve to a tenant. */
export async function getPublishedSignupSheetPublic(slug: string): Promise<SignupSheet | null> {
  await ensureCommonsReady()
  const normalized = slug.trim()
  const found = await sql<{ id: string; organization_id: string }>(
    `select id, organization_id from signup_sheets
      where slug = $1 and status = 'published'
      order by updated_at desc
      limit 2`,
    [normalized],
  )
  if (found.rows.length !== 1) return null
  return getSignupSheetById(found.rows[0].organization_id, found.rows[0].id)
}

export async function resolvePublishedSignupSheet(
  slug: string,
  orgId: string | null,
): Promise<SignupSheet | null> {
  if (orgId) return getPublishedSignupSheetBySlug(orgId, slug)
  return getPublishedSignupSheetPublic(slug)
}
