/**
 * Aggregate Students CMS rows into parent membership roster records.
 * Pure helpers. unit-tested without Wix.
 * Paid tier also merges Memberships.tier (checkout source of truth. Students can lag).
 */

export type StudentRosterRow = {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  archived: boolean
}

export type ParentRosterRow = {
  parentEmail: string
  parentFirstName: string
  parentLastName: string
  parentPhone: string
  /** Stable Staff account number (A10001+). */
  accountNumber: string
  /** Highest tier among active students, else free */
  membershipTier: string
  /** Paid family/faculty/board-seat Reef (anyone who gets paid-tier perks / magnets). */
  accountType: 'free' | 'paid'
  /**
   * True when this parent has an active Memberships CMS row (joined the new site).
   * False for directory/Jumbula-only parents with no Memberships record.
   */
  siteJoined: boolean
  /** Board seat complimentary Reef (75% EP codes, no SHMSREEF10). Still counts as paid. */
  boardComplimentary?: boolean
  students: StudentRosterRow[]
}

export type RosterFilters = {
  q?: string
  /**
   * free = joined free members (Memberships tier free).
   * free_legacy = directory-only free (no Memberships row).
   * paid | reef | lagoon | tide | faculty | all
   */
  tier?: string
  grade?: string
  includeArchived?: boolean
}

const TIER_RANK: Record<string, number> = {
  tide: 40,
  trench: 40,
  pearl: 40,
  lagoon: 30,
  supreme: 30,
  reef: 20,
  ruby: 20,
  faculty: 15,
  free: 0,
}

/** Canonical display tier for filters / UI. */
export function normalizeMembershipTier(raw: string | undefined | null): string {
  const t = String(raw ?? 'free').trim().toLowerCase()
  if (t === 'ruby') return 'reef'
  if (t === 'supreme') return 'lagoon'
  if (t === 'pearl' || t === 'trench') return 'tide'
  if (!t) return 'free'
  return t
}

export function isPaidTier(tier: string): boolean {
  const n = normalizeMembershipTier(tier)
  return n !== 'free' && n !== 'none' && n !== ''
}

/**
 * Staff roster paid/free counts.
 * Faculty + Reef / Lagoon / Tide count as paid (includes board-seat complimentary Reef).
 * Board comps still set boardComplimentary for EP coupon rules (no SHMSREEF10).
 */
export function isPaidAccountType(tier: string): boolean {
  const n = normalizeMembershipTier(tier)
  return n === 'reef' || n === 'lagoon' || n === 'tide' || n === 'faculty'
}

/** Paid-tier memberships count as paid, including board-seat Reef (magnet / portal perks). */
export function accountTypeForMembership(opts: {
  tier: string
  boardComplimentary?: boolean
}): 'free' | 'paid' {
  void opts.boardComplimentary
  return isPaidAccountType(opts.tier) ? 'paid' : 'free'
}

/** Lagoon / Tide: Cove code ends in 9 for event refreshments. Reef is paid but does not get this perk. */
export function isCovePaidMemberTier(tier: string): boolean {
  const n = normalizeMembershipTier(tier)
  return n === 'lagoon' || n === 'tide'
}

export function tierRank(tier: string | undefined | null): number {
  const n = normalizeMembershipTier(tier)
  return TIER_RANK[n] ?? (isPaidTier(n) ? 10 : 0)
}

export function pickHighestTier(tiers: string[]): string {
  let best = 'free'
  let bestRank = -1
  for (const tier of tiers) {
    const n = normalizeMembershipTier(tier)
    const rank = tierRank(n)
    if (rank > bestRank) {
      bestRank = rank
      best = n
    }
  }
  return best
}

type RawStudent = {
  _id?: string
  parentEmail?: string
  parentFirstName?: string
  parentLastName?: string
  parentPhone?: string
  firstName?: string
  lastName?: string
  grade?: string
  membershipTier?: string
  membershipStatus?: string
  archived?: boolean
}

export function buildParentRoster(items: RawStudent[]): ParentRosterRow[] {
  const byEmail = new Map<string, ParentRosterRow>()

  for (const item of items) {
    const parentEmail = String(item.parentEmail ?? '').trim().toLowerCase()
    if (!parentEmail) continue

    const student: StudentRosterRow = {
      id: item._id ?? '',
      firstName: String(item.firstName ?? '').trim(),
      lastName: String(item.lastName ?? '').trim(),
      grade: String(item.grade ?? '').trim(),
      membershipTier: normalizeMembershipTier(item.membershipTier),
      membershipStatus: String(item.membershipStatus ?? 'active').trim() || 'active',
      archived: item.archived === true,
    }

    const existing = byEmail.get(parentEmail)
    if (!existing) {
      byEmail.set(parentEmail, {
        parentEmail,
        parentFirstName: String(item.parentFirstName ?? '').trim(),
        parentLastName: String(item.parentLastName ?? '').trim(),
        parentPhone: String(item.parentPhone ?? '').trim(),
        accountNumber: '',
        membershipTier: 'free',
        accountType: 'free',
        siteJoined: false,
        students: [student],
      })
      continue
    }

    existing.students.push(student)
    if (!existing.parentFirstName && item.parentFirstName) {
      existing.parentFirstName = String(item.parentFirstName).trim()
    }
    if (!existing.parentLastName && item.parentLastName) {
      existing.parentLastName = String(item.parentLastName).trim()
    }
    if (!existing.parentPhone && item.parentPhone) {
      existing.parentPhone = String(item.parentPhone).trim()
    }
  }

  const parents = Array.from(byEmail.values())
  for (const row of parents) {
    const activeTiers = row.students
      .filter((s: StudentRosterRow) => !s.archived)
      .map((s: StudentRosterRow) => s.membershipTier)
    const tiers = activeTiers.length
      ? activeTiers
      : row.students.map((s: StudentRosterRow) => s.membershipTier)
    row.membershipTier = pickHighestTier(tiers)
    row.accountType = accountTypeForMembership({
      tier: row.membershipTier,
      boardComplimentary: row.boardComplimentary,
    })
    row.students.sort((a: StudentRosterRow, b: StudentRosterRow) =>
      `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`),
    )
  }

  return parents.sort((a, b) => a.parentEmail.localeCompare(b.parentEmail))
}

/** Memberships CMS row used to override / fill paid status on the roster. */
export type MembershipRosterRow = {
  email: string
  tier: string
  status?: string
  parentFirstName?: string
  parentLastName?: string
  parentPhone?: string
  accountNumber?: string
  /** True when Memberships has board season EP codes (gifted board seat). */
  boardComplimentary?: boolean
}

/**
 * Apply Memberships CMS tiers onto a Students-built roster.
 * Memberships.tier is the checkout source of truth; Students.membershipTier can lag.
 */
export function applyMembershipsToRoster(
  roster: ParentRosterRow[],
  memberships: MembershipRosterRow[],
): ParentRosterRow[] {
  const byEmail = new Map(
    roster.map((r) => [r.parentEmail, { ...r, students: [...r.students], siteJoined: r.siteJoined === true }]),
  )

  for (const m of memberships) {
    const email = String(m.email ?? '').trim().toLowerCase()
    if (!email) continue
    const status = String(m.status ?? 'active').trim().toLowerCase()
    if (status === 'expired' || status === 'cancelled' || status === 'canceled') continue

    const tier = normalizeMembershipTier(m.tier)
    const accountNumber = String(m.accountNumber ?? '').trim().toUpperCase()

    const existing = byEmail.get(email)
    if (!existing) {
      // Memberships-only row (paid override, or free with account number)
      if (!isPaidTier(tier) && !accountNumber) continue
      byEmail.set(email, {
        parentEmail: email,
        parentFirstName: String(m.parentFirstName ?? '').trim(),
        parentLastName: String(m.parentLastName ?? '').trim(),
        parentPhone: String(m.parentPhone ?? '').trim(),
        accountNumber,
        membershipTier: isPaidTier(tier) ? tier : 'free',
        boardComplimentary: m.boardComplimentary === true,
        accountType: accountTypeForMembership({
          tier,
          boardComplimentary: m.boardComplimentary === true,
        }),
        siteJoined: true,
        students: [],
      })
      continue
    }

    existing.siteJoined = true
    if (accountNumber) existing.accountNumber = accountNumber
    if (m.boardComplimentary === true) existing.boardComplimentary = true

    // Do not let a free Memberships row wipe a paid Students tier
    if (!isPaidTier(tier)) {
      if (!isPaidAccountType(existing.membershipTier)) {
        existing.membershipTier = 'free'
        existing.accountType = 'free'
      } else {
        existing.accountType = accountTypeForMembership({
          tier: existing.membershipTier,
          boardComplimentary: existing.boardComplimentary,
        })
      }
      continue
    }

    const merged = pickHighestTier([existing.membershipTier, tier])
    existing.membershipTier = merged
    existing.accountType = accountTypeForMembership({
      tier: merged,
      boardComplimentary: existing.boardComplimentary,
    })
    if (!existing.parentFirstName && m.parentFirstName) {
      existing.parentFirstName = String(m.parentFirstName).trim()
    }
    if (!existing.parentLastName && m.parentLastName) {
      existing.parentLastName = String(m.parentLastName).trim()
    }
    if (!existing.parentPhone && m.parentPhone) {
      existing.parentPhone = String(m.parentPhone).trim()
    }
  }

  return Array.from(byEmail.values()).sort((a, b) =>
    a.parentEmail.localeCompare(b.parentEmail),
  )
}

export function filterParentRoster(
  rows: ParentRosterRow[],
  filters: RosterFilters = {},
): ParentRosterRow[] {
  const q = String(filters.q ?? '').trim().toLowerCase()
  const tier = String(filters.tier ?? 'all').trim().toLowerCase() || 'all'
  const grade = String(filters.grade ?? '').trim()
  const includeArchived = filters.includeArchived === true

  return rows
    .map((row) => {
      const students = includeArchived
        ? row.students
        : row.students.filter((s) => !s.archived)
      return { ...row, students }
    })
    .filter((row) => {
      // Keep Memberships-only paid parents, faculty, and board seats (no student rows yet)
      if (!includeArchived && row.students.length === 0) {
        const t = normalizeMembershipTier(row.membershipTier)
        if (row.accountType !== 'paid' && t !== 'faculty' && !row.boardComplimentary) return false
      }

      // Joined free = Memberships row on new site. Legacy = directory-only free.
      if (tier === 'free') {
        if (row.accountType !== 'free' || row.siteJoined !== true) return false
      } else if (tier === 'free_legacy') {
        if (row.accountType !== 'free' || row.siteJoined === true) return false
      } else if (tier === 'paid') {
        if (row.accountType !== 'paid') return false
      } else if (tier !== 'all') {
        const want = normalizeMembershipTier(tier)
        const hasTier = row.students.some(
          (s) => normalizeMembershipTier(s.membershipTier) === want,
        )
        if (!hasTier && normalizeMembershipTier(row.membershipTier) !== want) return false
      }

      if (grade) {
        const g = grade.replace(/^g/i, '')
        if (!row.students.some((s) => String(s.grade) === g)) return false
      }

      if (q.length >= 1) {
        const hay = [
          row.accountNumber,
          row.parentEmail,
          row.parentFirstName,
          row.parentLastName,
          row.parentPhone,
          ...row.students.flatMap((s) => [s.firstName, s.lastName, s.grade, s.membershipTier]),
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }

      return true
    })
}

export function rosterEmails(rows: ParentRosterRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.parentEmail).filter(Boolean)))
}
