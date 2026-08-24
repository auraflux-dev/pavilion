/** Map Wix Students CMS rows to member portal student cards. */
export function mapPortalStudents(
  rows: Array<Record<string, unknown>>,
  parentEmail: string,
) {
  return rows.map((item) => ({
    id: String(item._id ?? ''),
    firstName: String(item.firstName ?? ''),
    lastName: String(item.lastName ?? ''),
    grade: String(item.grade ?? ''),
    membershipTier: String(item.membershipTier ?? 'free'),
    membershipStatus: String(item.membershipStatus ?? 'active'),
    discountCode: (item.discountCode as string | null) ?? null,
    storeCardBalance: Number(item.storeCardBalance ?? 0) || 0,
    parentPhone: String(item.parentPhone ?? ''),
    secondaryPhone: String(item.secondaryPhone ?? ''),
    emergencyContact: String(item.emergencyContact ?? ''),
    emergencyPhone: String(item.emergencyPhone ?? ''),
    allergies: String(item.allergies ?? ''),
    medicalConditions: String(item.medicalConditions ?? ''),
    medications: String(item.medications ?? ''),
    pickupAuthorized: String(item.pickupAuthorized ?? ''),
    selfRelease: Boolean(item.selfRelease),
    photoMediaConsent:
      item.photoMediaConsent === true
        ? true
        : item.photoMediaConsent === false
          ? false
          : null,
    primaryParentEmail: String(item.parentEmail ?? parentEmail),
    parentFirstName: String(item.parentFirstName ?? ''),
    parentLastName: String(item.parentLastName ?? ''),
    familyProfileConfirmedAt: String(item.familyProfileConfirmedAt ?? ''),
  }))
}
