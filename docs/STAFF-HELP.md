# Staff help docs (July 2026)

Canonical copies live in Google Drive → **SHMS PTO Platform Docs** → **Wix Admin Guides**.  
Staging: https://shmspto.vercel.app/staff

Parent / free / paid member FAQs live in the **Member portal** (`/member-portal` → Portal help), not Staff.

## Audience shells (who you are)

| Audience | Where | Top nav |
|----------|--------|---------|
| **Visitor** | Public pages | Marketing CMS nav + Log in |
| **Free / paid member** | `/member-portal` | Member shell + Portal help FAQ |
| **Staff** | `/staff` | Staff shell → Help tab + Drive docs |

Browsing the public site while logged in still uses the marketing nav (with a Free/Paid/Visitor hint). Portal and Staff never reuse that bar.

## Staff workspaces (in Staff, not Wix)

| View | Roles | What |
|------|-------|------|
| Projects | Everyone | Year board / assign tasks |
| Members / Staff access | Admin | Lookup, act-as, archive, roles |
| Social | Marketing | Facebook publish |
| Surveys | Marketing / secretary | **Create**, share, review, CSV |
| Messages | Programs / instructor / secretary | Parent portal inbox |
| **Inbox / Calendar / Docs** | Everyone (Connect Google) | Your `@shmspto.org` Gmail threads, folders, calendar, Drive |
| Minutes | Secretary | Publish meeting minutes |
| Programs | Programs / instructor | Registration toggles + sessions |
| Payments | Treasurer | Needs Reconciliation + retry load |
| Events | Events (+ related) | Upcoming list + link to Wix Events |
| Store & spirit | Retail | Product ID allowlists |
| **Memberships** | membership / secretary / admin | Roster, mass email, WhatsApp compose |
| **Discounts** | retail / related | Coupon codes for checkout / spirit |
| Page copy | Marketing / secretary | PageContent heroes |
| **Site settings** | Role-scoped | Announcement, contact, WhatsApp grades, goals, social URLs, retail allowlists |
| **Board roster** | Secretary / admin | BoardMembers add/edit |
| **Nav & footer** | Marketing / secretary | NavLinks |
| **FAQs** | Marketing / membership / secretary | FAQItems |
| **Volunteer ops** | Events / secretary | VolunteerOpportunities |
| **Fundraising** | Programs / treasurer / marketing | FundraisingCTAs + goal SiteSettings |
| **Membership tiers** | Membership / secretary | MembershipTiers map (Catalog still owns paid display copy) |
| **Wellness** | Wellness / events | Wish list & appreciation notes |
| **Help** | Everyone | Links to Drive how-tos for your role |

## Staff portal — start here

| Doc | Who | What |
|-----|-----|------|
| **30 - Staff Portal Quick Start** | Everyone | Sign-in, what each panel is, first-week checklist |
| **26 - Staff Roles & Portal Workspaces** | Everyone / admin | `@shmspto.org` vs personal email, roles, self-registration |
| **29 - Staff Year Project Board** | Everyone | Year swimlanes, projects, assign tasks to people |
| **31 - Admin Lookup, Act-as & Student Archive** | Admin | Search parents, act-as, archive/restore students |
| **32 - Staff Workspaces Map (Role Tools)** | Everyone | Which role sees which top-nav workspace |
| **33 - Staff Inbox, Calendar & Docs** | Everyone | Connect Google, threads, folders, Sapling, signature |
| **34 - Memberships Workspace** | VP Memberships / secretary / admin | Roster, mass email, WhatsApp |
| **36 - Discount Codes & Spirit Coupons** | Retail / treasurer | Coupon tools |
| **37 - Site Capability Audit & Test Plans** | Everyone / QA | Visitor · portal · staff gaps + TP checklists |
| **38 - Parent Portal Checklist** | Staff helping parents | Free vs paid what parents can do |
| **27 - Member Portal Parent Support Guide** | Everyone helping parents | Walk a parent through portal screens |

## Member portal (free & paid parents)

| Surface | Who | What |
|---------|-----|------|
| **Portal help** panel | Free & paid members | In-app FAQ (account, students, store card, Reef/Lagoon/Tide, upgrade, coupons) |
| **35 - Membership Tiers Reef · Lagoon · Tide** | Parents (Drive) | Longer join/upgrade guide |
| **38 - Parent Portal Checklist** | Parents (Drive) | Free vs paid capability checklist |
| Public `/membership` | Visitors + members | Tier cards and checkout |

## Role-specific on Staff

| Doc | Role | What |
|-----|------|------|
| **16** | Programs / instructor / secretary | Parent portal inbox messages |
| **23–24** | Marketing / secretary | Surveys **create**, share, review, CSV |
| **25** | Marketing | Facebook publish from Staff |
| **12b** | Treasurer / support | Store card, auto top-off, Needs Reconciliation |
| **13 / 15 / 19 / 21** | Marketing / programs / secretary / retail | Page copy, sessions, minutes, store & spirit UUID lists |
| **03 v2** | Board / CMS | Membership tier CMS fields (display names Reef/Lagoon/Tide) |

## Admin one-time

| Doc | Who | What |
|-----|-----|------|
| **Connect Google Workspace (setup)** | Workspace admin | OAuth Web client, Vercel env, StaffGoogleTokens |

## Publish / refresh Drive

```bash
node --env-file=frontend/.env.local scripts/create-pto-docs.js
node scripts/insert-doc-screenshots.js
```
