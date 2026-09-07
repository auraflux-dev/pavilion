/**
 * Loudoun Robotics vendor fee (Fall + Spring, per semester).
 * 12 × 60-minute sessions. Base covers up to 15 students; +$240 each through 30.
 * Source: vendor proposal Aug 2026 ($5,500 → $4,500 base; structure unchanged).
 */

export const LOUDOUN_ROBOTICS_SESSIONS = 12
export const LOUDOUN_ROBOTICS_SESSION_MINUTES = 60

/** Flat cohort fee for the first 15 enrolled students. */
export const LOUDOUN_ROBOTICS_COHORT_BASE = 4500

/** Students included in the base cohort fee. */
export const LOUDOUN_ROBOTICS_COHORT_BASE_SEATS = 15

/** Per-student fee for enrollments 16–30. */
export const LOUDOUN_ROBOTICS_ADDITIONAL_STUDENT = 240

export const LOUDOUN_ROBOTICS_MAX_ENROLLMENT = 30

/** Soft minimum — vendor prefers to make under-15 work rather than cancel. */
export const LOUDOUN_ROBOTICS_SOFT_MIN_ENROLLMENT = 15

export function loudounRoboticsSemesterCost(enrolled: number): number {
  const n = Math.max(0, Math.min(LOUDOUN_ROBOTICS_MAX_ENROLLMENT, Math.floor(enrolled)))
  if (n <= LOUDOUN_ROBOTICS_COHORT_BASE_SEATS) return LOUDOUN_ROBOTICS_COHORT_BASE
  return (
    LOUDOUN_ROBOTICS_COHORT_BASE +
    (n - LOUDOUN_ROBOTICS_COHORT_BASE_SEATS) * LOUDOUN_ROBOTICS_ADDITIONAL_STUDENT
  )
}

export function loudounRoboticsPerStudentCost(enrolled: number): number {
  const n = Math.max(1, Math.floor(enrolled))
  return loudounRoboticsSemesterCost(n) / n
}

export function loudounRoboticsPerSessionPerStudent(enrolled: number): number {
  return loudounRoboticsPerStudentCost(enrolled) / LOUDOUN_ROBOTICS_SESSIONS
}

/** Parent tuition collected after a flat discount rate (0–1). */
export function roboticsParentCollections(
  enrolled: number,
  listTuition = 425,
  effectiveDiscountRate = 0,
): number {
  const n = Math.max(0, Math.floor(enrolled))
  const rate = Math.max(0, Math.min(1, effectiveDiscountRate))
  return Math.round(n * listTuition * (1 - rate) * 100) / 100
}

export function roboticsPtoMarginAfterVendor(opts: {
  enrolled: number
  listTuition?: number
  effectiveDiscountRate?: number
}): number {
  const collected = roboticsParentCollections(
    opts.enrolled,
    opts.listTuition ?? 425,
    opts.effectiveDiscountRate ?? 0,
  )
  return Math.round((collected - loudounRoboticsSemesterCost(opts.enrolled)) * 100) / 100
}

/** Reference rows from the vendor proposal. */
export const LOUDOUN_ROBOTICS_VENDOR_TABLE = [
  { enrolled: 15, semester: 4500, perStudent: 300, perHour: 25 },
  { enrolled: 20, semester: 5700, perStudent: 285, perHour: 23.75 },
  { enrolled: 25, semester: 6900, perStudent: 276, perHour: 23 },
  { enrolled: 30, semester: 8100, perStudent: 270, perHour: 22.5 },
] as const
