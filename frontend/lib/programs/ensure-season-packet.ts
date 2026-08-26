/**
 * One Staff action: create missing packet classes + write locked schedule into CMS.
 * Does not change fees, registration, names, or landing copy on existing rows
 * (new rows get landing defaults from the seed insert helpers).
 */
import { getWixClient } from '@/lib/wix-client'
import { fetchAllCmsPrograms } from '@/lib/programs/cms-programs-query'
import {
  fall2026PacketCmsDefaults,
  fallEpClassById,
  matchFall2026EpClass,
  selectCurrentFall2026Programs,
} from '@/lib/programs/fall-2026-ep'
import {
  matchSpring2027EpClass,
  selectCurrentSpring2027Programs,
  spring2027PacketCmsDefaults,
  springEpClassById,
} from '@/lib/programs/spring-2027-ep'
import {
  fall2026ProgramInsertRow,
  missingFall2026SeedPrograms,
} from '@/lib/programs/seed-fall-2026-programs'
import {
  missingSpring2027SeedPrograms,
  spring2027ProgramInsertRow,
} from '@/lib/programs/seed-spring-2027-programs'
import { revalidatePublicPrograms } from '@/lib/staff/revalidate-public'
import type { PublicCatalogSeasonId } from '@/lib/programs/season'

export type EnsurePacketResult = {
  ok: true
  season: PublicCatalogSeasonId
  created: number
  updated: number
  createdIds: string[]
  updatedIds: string[]
  message: string
}

export async function ensureSeasonPacket(
  season: PublicCatalogSeasonId,
): Promise<EnsurePacketResult> {
  const client = getWixClient()
  let existing = await fetchAllCmsPrograms()

  const createdIds: string[] = []
  const toCreate =
    season === 'spring-2027'
      ? missingSpring2027SeedPrograms(existing)
      : missingFall2026SeedPrograms(existing)

  for (const staging of toCreate) {
    const row =
      season === 'spring-2027'
        ? spring2027ProgramInsertRow(staging)
        : fall2026ProgramInsertRow(staging)
    const inserted = await client.items.insert('Programs', row)
    const id = String((inserted as { _id?: string })._id ?? '')
    if (id) createdIds.push(id)
  }

  if (createdIds.length) {
    existing = await fetchAllCmsPrograms()
  }

  const rows =
    season === 'spring-2027'
      ? selectCurrentSpring2027Programs(
          existing.map((p) => ({
            id: p._id,
            name: p.name,
            fallEpClassId: p.fallEpClassId,
            startDate: p.startDate,
            endDate: p.endDate,
            registrationOpen: p.registrationOpen,
            featured: p.featured,
            season: p.season,
            tags: p.tags,
          })),
        )
      : selectCurrentFall2026Programs(
          existing.map((p) => ({
            id: p._id,
            name: p.name,
            fallEpClassId: p.fallEpClassId,
            startDate: p.startDate,
            endDate: p.endDate,
            registrationOpen: p.registrationOpen,
            featured: p.featured,
            season: p.season,
            tags: p.tags,
          })),
        )

  const updatedIds: string[] = []
  for (const row of rows) {
    const program = existing.find((p) => p._id === row.id)
    if (!program) continue
    let patch: Record<string, string | number>
    if (season === 'spring-2027') {
      const klass =
        springEpClassById(String(program.fallEpClassId ?? '').trim()) ||
        matchSpring2027EpClass(program.name)
      if (!klass) continue
      patch = spring2027PacketCmsDefaults(klass)
    } else {
      const klass =
        fallEpClassById(String(program.fallEpClassId ?? '').trim()) ||
        matchFall2026EpClass(program.name)
      if (!klass) continue
      patch = fall2026PacketCmsDefaults(klass)
    }
    await client.items.update('Programs', {
      ...program,
      _id: program._id,
      ...patch,
    } as Parameters<typeof client.items.update>[1])
    updatedIds.push(program._id)
  }

  revalidatePublicPrograms()

  const label = season === 'spring-2027' ? 'Spring 2027' : 'Fall 2026'
  const parts: string[] = []
  if (createdIds.length) {
    parts.push(`created ${createdIds.length}`)
  }
  if (updatedIds.length) {
    parts.push(`synced schedule on ${updatedIds.length}`)
  }
  const message =
    parts.length > 0
      ? `${label} packet: ${parts.join(', ')}.`
      : `${label} packet is already in CMS with locked schedule fields.`

  return {
    ok: true,
    season,
    created: createdIds.length,
    updated: updatedIds.length,
    createdIds,
    updatedIds,
    message,
  }
}
