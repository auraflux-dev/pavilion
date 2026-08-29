import { getMigrations } from 'better-auth/db/migration'
import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { CRM_SCHEMA_SQL } from '@/lib/crm/schema-sql'
import { CRM_PLATFORM_SQL } from '@/lib/crm/schema-platform-sql'
import { SIGNUPS_SCHEMA_SQL } from '@/lib/signups/schema-sql'
import { CMS_SCHEMA_SQL } from '@/lib/cms/schema-sql'
import { PLATFORM_OWNERS_SQL, ensurePlatformOwnerSeed } from '@/lib/crm/platform-owners'
import { riversideSnapshot } from '@/lib/crm/riverside'
import { isDemoInstance } from '@/lib/demo/instance'

let ready: Promise<void> | null = null

export async function ensureCommonsReady(): Promise<void> {
  if (!commonsDbEnabled()) return
  if (!ready) {
    ready = migrateAndSeed().catch((err) => {
      ready = null
      throw err
    })
  }
  await ready
}

async function migrateAndSeed(): Promise<void> {
  await sql(CRM_SCHEMA_SQL)
  await sql(CRM_PLATFORM_SQL)
  await sql(SIGNUPS_SCHEMA_SQL)
  await applyCmsSchema()
  await sql(PLATFORM_OWNERS_SQL)
  await ensurePlatformOwnerSeed()
  const auth = getAuth()
  if (auth) {
    const ctx = await auth.$context
    const { runMigrations } = await getMigrations(ctx.options)
    await runMigrations()
  }
  if (isDemoInstance()) await seedRiverside()
}

/** Tolerate concurrent create-table races from parallel Next workers. */
async function applyCmsSchema(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sql(CMS_SCHEMA_SQL)
      return
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
      const msg = err instanceof Error ? err.message : String(err)
      if (code === '23505' || /already exists/i.test(msg)) {
        if (attempt === 2) return
        continue
      }
      throw err
    }
  }
}

async function seedRiverside(): Promise<void> {
  const snap = riversideSnapshot()
  const org = snap.organization
  await sql(
    `insert into organizations (id, name, slug, plan) values ($1, $2, $3, 'demo')
     on conflict (id) do update set name = excluded.name, slug = excluded.slug, plan = 'demo'`,
    [org.id, org.name, org.slug],
  )

  for (const p of snap.people) {
    await sql(
      `insert into people (id, organization_id, email, first_name, last_name, phone)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         email = excluded.email,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         phone = excluded.phone`,
      [p.id, p.organizationId, p.email, p.firstName, p.lastName, p.phone],
    )
  }

  for (const hh of snap.households) {
    await sql(
      `insert into households (
         id, organization_id, primary_person_id, confirmed_at,
         emergency_contact_name, emergency_contact_phone, pickup_authorized
       ) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         primary_person_id = excluded.primary_person_id,
         emergency_contact_name = excluded.emergency_contact_name,
         emergency_contact_phone = excluded.emergency_contact_phone,
         pickup_authorized = excluded.pickup_authorized`,
      [
        hh.id,
        hh.organizationId,
        hh.primaryPersonId,
        hh.confirmedAt,
        hh.emergencyContactName,
        hh.emergencyContactPhone,
        hh.pickupAuthorized,
      ],
    )
  }

  for (const a of snap.adults) {
    await sql(
      `insert into household_adults (household_id, person_id, role)
       values ($1, $2, $3)
       on conflict (household_id, person_id) do update set role = excluded.role`,
      [a.householdId, a.personId, a.role],
    )
  }

  for (const s of snap.students) {
    await sql(
      `insert into students (
         id, household_id, first_name, last_name, grade, archived,
         allergies, medical_conditions, medications, self_release, photo_media_consent
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do update set
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         grade = excluded.grade,
         archived = excluded.archived`,
      [
        s.id,
        s.householdId,
        s.firstName,
        s.lastName,
        s.grade,
        s.archived,
        s.allergies,
        s.medicalConditions,
        s.medications,
        s.selfRelease,
        s.photoMediaConsent,
      ],
    )
  }

  for (const m of snap.memberships) {
    await sql(
      `insert into memberships (id, household_id, tier, status, expires_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set tier = excluded.tier, status = excluded.status`,
      [m.id, m.householdId, m.tier, m.status, m.expiresAt],
    )
  }

  for (const c of snap.storeCards) {
    await sql(
      `insert into store_cards (id, household_id, gan, external_id, balance_cents)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set gan = excluded.gan, balance_cents = excluded.balance_cents`,
      [c.id, c.householdId, c.gan, c.externalId, c.balanceCents],
    )
  }

  await sql(
    `insert into staff_assignments (person_id, role, board_title, organization_id)
     values ('p_jordan_lee', 'admin', 'President (demo)', $1)
     on conflict (person_id, role) do update set
       board_title = excluded.board_title,
       organization_id = excluded.organization_id`,
    [org.id],
  )

  const { seedDemoCmsIfEmpty } = await import('@/lib/cms/store')
  await seedDemoCmsIfEmpty(org.id)
}
