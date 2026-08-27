# Staff form queues vs CMS backends

Audience: product

## How this fits

| Layer | Where |
|-------|--------|
| Product Staff UI (queues, status, mailto) | **`~/pavilion`** |
| Pavilion CMS (demo + non-SHMS) | **Built on pavilion** (Postgres / platform). Not Wix. Demo uses fixtures today. |
| Wix CMS / Data | **SHMS VIP only** via promote → `~/shmspto` |

Author form queues on pavilion. SHMS deploys them against Wix. Pavilion product needs its own CMS store so demo/trials are not Wix-backed.

## Form / submission queues

| Source | Store (SHMS) | Staff today | Notes |
|--------|--------------|-------------|-------|
| `/volunteer` (logged in) | Wix `Volunteers` | **Staff → Volunteers → Volunteer signups** | Status workflow. Email still fires. Pavilion demo: stub row. |
| `/contact` + portal help + business-owner | Wix `ContactSubmissions` | **CMS_ONLY** (Home activity count → Inbox, no list UI) | Next: Staff forms inbox on pavilion. |
| `/newsletter` subscribe | Wix `NewsletterSubscribers` | **PARTIAL** | Count for outreach; no browse UI. |
| `/survey/[slug]` | Wix `SurveyResponses` | **Staff → Surveys** | Covered. |
| Program register | Wix `ProgramEnrollments` | **Staff → Programs** | Covered. |
| Expense claims | Wix `ExpenseReimbursements` | **Staff → Expenses** | Covered. |
| Parent messages | Wix `ParentMessages` | **Staff → Messages** | Covered. |

## P0 backlog

1. **Pavilion CMS** for content + form submissions (replace demo fixtures / empty platform paths).
2. **`ContactSubmissions` Staff queue** (same pattern as volunteer).
3. **`NewsletterSubscribers` browser**.

## Code

- Volunteer queue: `frontend/app/api/staff/volunteers/submissions/route.ts`
- Panel: `frontend/components/staff/staff-volunteer-submissions-panel.tsx`
