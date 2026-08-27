# Staff vs Wix CMS (form queues & collections)

Audience: product

What lives in Wix CMS but is not (fully) operable from Staff `/staff`. Updated when volunteer signups moved into Staff.

## Form / submission queues

| Source | Wix collection | Staff today | Notes |
|--------|----------------|-------------|-------|
| `/volunteer` (logged in) | `Volunteers` | **Staff → Volunteers → Volunteer signups** | Status: new / contacted / scheduled / declined / done. Email still fires. |
| `/contact` + portal help + business-owner | `ContactSubmissions` | **CMS_ONLY** (count on Home activity → Inbox, no list UI) | Email by department. Next: Staff forms inbox. |
| `/newsletter` subscribe | `NewsletterSubscribers` | **PARTIAL** (count for outreach send; no browse/unsubscribe UI) | Unsub helpers exist in code; no Staff list. |
| `/survey/[slug]` | `SurveyResponses` | **Staff → Surveys** | Covered. |
| Program register | `ProgramEnrollments` | **Staff → Programs** | Covered. |
| Expense claims | `ExpenseReimbursements` | **Staff → Expenses** | Covered. |
| Parent messages | `ParentMessages` | **Staff → Messages** | Covered. |

## Content collections (editable in Staff via CMS panels or dedicated UIs)

Covered: VolunteerOpportunities, BoardMembers, NavLinks, FAQItems, FundraisingCTAs, Sponsors, MembershipTiers (thin map), Programs, MeetingMinutes, CommsCalendarItems, Newsletter templates/jobs, Cove/Spirit allowlists, SiteSettings (role-scoped), PageContent, Events (API), Surveys defs.

## Still Wix-dashboard / ops (intentional or backlog)

| Collection / system | Why not Staff (yet) |
|---------------------|---------------------|
| `Students` / `Memberships` / `Payments` / `FamilyGuardians` | Member + money ops; Staff Members/Payments cover ops paths; no raw CMS browser |
| `StaffRoles` / `StaffGoogleTokens` / `StaffCanvaTokens` / `StaffPlaidItems` | Access / connectors UIs, not CMS tables |
| `DiscountCodes` | Staff → Discounts |
| Wix Stores catalog products | Staff → Cove catalog + Membership product IDs; EP tuition now links via `Programs.productId` (Pavilion) |
| Live Plaid / Square dashboards | External; Budget syncs what we need |

## P0 backlog (bring into Staff)

1. **`ContactSubmissions` queue** — same pattern as volunteer signups (filter by department/status, mailto, mark done). Home activity already counts them but links to Inbox.
2. **`NewsletterSubscribers` browser** — list + unsubscribe + export for Marketing.
3. Optional: unified **Staff → Forms** workspace that tabs Contact + Volunteer + other public forms.

## Code

- Volunteer queue: `frontend/app/api/staff/volunteers/submissions/route.ts`
- Panel: `frontend/components/staff/staff-volunteer-submissions-panel.tsx`
- Notify inboxes: `resolveSubmissionInbox('volunteer')` always includes Events + Rob + Secretary
