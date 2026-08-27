/**
 * Public EP calendar dates stay draft until Staff approves them.
 * Source of truth: SiteSettings key `epMeetingDatesApproved` (Staff → Programs toggle).
 * Server-only async helpers — client code must import from ep-meeting-dates-shared.
 */

import { getSiteSettings } from '@/lib/api/site-settings'
import {
  EP_MEETING_DATES_APPROVED_KEY,
  EP_MEETING_DATES_PROPOSED_LABEL,
} from '@/lib/programs/ep-meeting-dates-shared'

export {
  EP_MEETING_DATES_APPROVED_KEY,
  EP_MEETING_DATES_PROPOSED_LABEL,
  programHasPublicMeetingDates,
} from '@/lib/programs/ep-meeting-dates-shared'

/** Visitor-facing label when nights are still draft. */
export function epMeetingDatesProposedLabel(): string {
  return EP_MEETING_DATES_PROPOSED_LABEL
}

/** True when Staff has approved concrete meeting nights for parents. */
export async function areEpMeetingDatesApproved(): Promise<boolean> {
  const settings = await getSiteSettings()
  return settings.getBool(EP_MEETING_DATES_APPROVED_KEY, false)
}
