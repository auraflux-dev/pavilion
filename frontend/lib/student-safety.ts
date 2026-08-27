/** Client-safe student safety helpers (no CMS/db imports). */

export type StudentSafety = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  parentPhone?: string
  secondaryPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string
  medicalConditions?: string
  medications?: string
  pickupAuthorized?: string
  selfRelease?: boolean
  photoMediaConsent?: boolean | null
  membershipTier?: string
  archived?: boolean
}

export function studentSafetyComplete(
  s: StudentSafety,
): { ok: true } | { ok: false; error: string } {
  if (!String(s.parentPhone ?? '').trim()) {
    return {
      ok: false,
      error: 'Add a parent phone number on the student profile before registering.',
    }
  }
  if (!String(s.emergencyContact ?? '').trim() || !String(s.emergencyPhone ?? '').trim()) {
    return {
      ok: false,
      error:
        'Add an emergency contact name and phone on the student profile before registering.',
    }
  }
  if (!String(s.pickupAuthorized ?? '').trim()) {
    return {
      ok: false,
      error:
        'Add at least one authorized pick-up person on the student profile before registering.',
    }
  }
  return { ok: true }
}
