/** Shared EP meeting-date labels + pure helpers (client-safe — no CMS/db imports). */

import type { Program } from '@/lib/api/programs'

export const EP_MEETING_DATES_APPROVED_KEY = 'epMeetingDatesApproved'

export const EP_MEETING_DATES_PROPOSED_LABEL = 'Proposed — pending approval'

/** Public payloads: after redact, calendar fields are empty until approved. */
export function programHasPublicMeetingDates(
  program: Pick<Program, 'startDate' | 'endDate' | 'meetingDates'>,
): boolean {
  if (String(program.meetingDates ?? '').trim()) return true
  if (String(program.startDate ?? '').trim().slice(0, 10)) return true
  if (String(program.endDate ?? '').trim().slice(0, 10)) return true
  return false
}
