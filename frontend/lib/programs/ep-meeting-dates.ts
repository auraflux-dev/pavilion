/**
 * Public EP calendar dates stay draft until Staff approves them.
 * Source of truth: SiteSettings key `epMeetingDatesApproved` (Staff → Programs toggle).
 */

import type { Program } from '@/lib/api/programs'
import { getSiteSettings } from '@/lib/api/site-settings'

export const EP_MEETING_DATES_APPROVED_KEY = 'epMeetingDatesApproved'

export const EP_MEETING_DATES_PROPOSED_LABEL = 'Proposed — pending approval'

/** Visitor-facing label when nights are still draft. */
export function epMeetingDatesProposedLabel(): string {
  return EP_MEETING_DATES_PROPOSED_LABEL
}

/** True when Staff has approved concrete meeting nights for parents. */
export async function areEpMeetingDatesApproved(): Promise<boolean> {
  const settings = await getSiteSettings()
  return settings.getBool(EP_MEETING_DATES_APPROVED_KEY, false)
}

/** Public payloads: after redact, calendar fields are empty until approved. */
export function programHasPublicMeetingDates(
  program: Pick<Program, 'startDate' | 'endDate' | 'meetingDates'>,
): boolean {
  if (String(program.meetingDates ?? '').trim()) return true
  if (String(program.startDate ?? '').trim().slice(0, 10)) return true
  if (String(program.endDate ?? '').trim().slice(0, 10)) return true
  return false
}
