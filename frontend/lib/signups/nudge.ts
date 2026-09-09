/**
 * Volunteer auto-nudge: portal inbox when signup sheets still have open slots.
 */
import 'server-only'

import { getWixClient } from '@/lib/wix-client'
import { sqlForOrg } from '@/lib/crm/tenant'
import { getSignupSheetById, listSignupSheets } from '@/lib/signups/sheets'
import type { SignupSheet } from '@/lib/signups/types'
import { isDemoInstance } from '@/lib/demo/instance'

const DEFAULT_COOLDOWN_MS = 48 * 60 * 60 * 1000

export type OpenSlotNeed = {
  slotId: string
  title: string
  remaining: number
  startsAt: string | null
}

export type VolunteerNudgeResult = {
  sheetId: string
  title: string
  openSlots: number
  remainingSpots: number
  nudged: boolean
  skipped?: string
}

function openNeeds(sheet: SignupSheet): OpenSlotNeed[] {
  return sheet.slots
    .map((s) => ({
      slotId: s.id,
      title: s.title,
      remaining: Math.max(0, s.quantityNeeded - s.quantityClaimed),
      startsAt: s.startsAt,
    }))
    .filter((s) => s.remaining > 0)
}

function withinWindow(sheet: SignupSheet, needs: OpenSlotNeed[], daysAhead: number): boolean {
  const now = Date.now()
  const horizon = now + daysAhead * 24 * 60 * 60 * 1000
  const sheetStart = sheet.startsAt ? new Date(sheet.startsAt).getTime() : null
  if (sheetStart && sheetStart > horizon) return false
  if (sheet.endsAt && new Date(sheet.endsAt).getTime() < now) return false
  const slotTimes = needs
    .map((n) => (n.startsAt ? new Date(n.startsAt).getTime() : null))
    .filter((t): t is number => t != null)
  if (slotTimes.length === 0) return true
  return slotTimes.some((t) => t >= now - 12 * 60 * 60 * 1000 && t <= horizon)
}

async function markNudged(orgId: string, sheet: SignupSheet): Promise<void> {
  const settings = {
    ...sheet.settings,
    lastVolunteerNudgeAt: new Date().toISOString(),
  }
  await sqlForOrg(
    orgId,
    `update signup_sheets set settings_json = $1, updated_at = now() where id = $2`,
    [JSON.stringify(settings), sheet.id],
  )
}

export async function nudgeSignupSheet(
  orgId: string,
  sheetId: string,
  opts?: {
    fromName?: string
    force?: boolean
    daysAhead?: number
    cooldownMs?: number
  },
): Promise<VolunteerNudgeResult> {
  const sheet = await getSignupSheetById(orgId, sheetId)
  if (!sheet) {
    return {
      sheetId,
      title: '',
      openSlots: 0,
      remainingSpots: 0,
      nudged: false,
      skipped: 'not found',
    }
  }
  if (sheet.status !== 'published') {
    return {
      sheetId,
      title: sheet.title,
      openSlots: 0,
      remainingSpots: 0,
      nudged: false,
      skipped: 'not published',
    }
  }

  const needs = openNeeds(sheet)
  const remainingSpots = needs.reduce((sum, n) => sum + n.remaining, 0)
  if (remainingSpots === 0) {
    return {
      sheetId,
      title: sheet.title,
      openSlots: 0,
      remainingSpots: 0,
      nudged: false,
      skipped: 'full',
    }
  }

  const daysAhead = opts?.daysAhead ?? sheet.settings.reminderDaysBefore ?? 14
  if (!withinWindow(sheet, needs, daysAhead)) {
    return {
      sheetId,
      title: sheet.title,
      openSlots: needs.length,
      remainingSpots,
      nudged: false,
      skipped: 'outside window',
    }
  }

  const cooldown = opts?.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const last = sheet.settings.lastVolunteerNudgeAt
    ? new Date(sheet.settings.lastVolunteerNudgeAt).getTime()
    : 0
  if (!opts?.force && last && Date.now() - last < cooldown) {
    return {
      sheetId,
      title: sheet.title,
      openSlots: needs.length,
      remainingSpots,
      nudged: false,
      skipped: 'cooldown',
    }
  }

  const lines = needs
    .slice(0, 8)
    .map((n) => `· ${n.title}: ${n.remaining} still needed`)
    .join('\n')
  const subject = `Help still needed: ${sheet.title}`
  const body = [
    `We still need volunteers for “${sheet.title}.”`,
    '',
    lines,
    '',
    `Sign up here: ${sheet.publicPath}`,
    '',
    'Thank you for helping when you can.',
  ].join('\n')

  try {
    const client = getWixClient()
    await client.items.insert('ParentMessages', {
      parentEmail: null,
      audience: 'all',
      grade: null,
      studentId: null,
      studentName: null,
      programName: null,
      fromName: opts?.fromName || 'PTO Volunteers',
      subject,
      body,
      sentAt: new Date().toISOString(),
      active: true,
    })
  } catch (err) {
    if (!isDemoInstance()) throw err
    console.warn('volunteer nudge: ParentMessages insert skipped', err)
  }

  await markNudged(orgId, sheet)
  return {
    sheetId,
    title: sheet.title,
    openSlots: needs.length,
    remainingSpots,
    nudged: true,
  }
}

export async function nudgeOpenSignupSheets(
  orgId: string,
  opts?: { fromName?: string; force?: boolean },
): Promise<VolunteerNudgeResult[]> {
  const summaries = await listSignupSheets(orgId)
  const published = summaries.filter((s) => s.status === 'published')
  const results: VolunteerNudgeResult[] = []
  for (const s of published) {
    results.push(await nudgeSignupSheet(orgId, s.id, opts))
  }
  return results
}
