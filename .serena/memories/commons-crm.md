Commons CRM is our own household model, not Clerk.

- Postgres contract: `frontend/lib/crm/schema.sql` (organizations, people, households, household_adults, students, memberships, store_cards, staff_assignments).
- TypeScript: `frontend/lib/crm/`.
- Demo in-memory tenant: `riversideSnapshot()` — Nguyen (Family/lagoon, $42.50), Patel (Member/reef), Brooks (free). Staff Jordan Lee is a person without a household.
- Stone Hill stays on Wix Members/Students/Memberships. Do not run this schema on SHMS.
- Better Auth is later: `people.auth_user_id` stays null; demo still uses signed `demo_review` cookies.
- Demo staff Members + portal students are mapped from this snapshot (`frontend/lib/demo/seed.ts`).
