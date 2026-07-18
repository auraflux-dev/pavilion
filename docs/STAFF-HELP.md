# Staff help docs (July 2026)

Canonical copies live in Google Drive → **SHMS PTO Platform Docs**.  
Staging: https://shmspto.vercel.app/staff

**Pending review:** Drive folder [Pending Review — July 2026](https://drive.google.com/drive/folders/1O9hFCYQ4fQNYkAi5Sq-00L4zWBpdV83i) (`@shmspto.org` can comment).

## Audience shells (who you are)

| Audience | Where | Top nav |
|----------|--------|---------|
| **Visitor** | Public pages | Marketing CMS nav + Log in |
| **Free / paid member** | `/member-portal` | Member shell (My portal, Upgrade/Membership, Store, Programs) — labeled Free or Paid |
| **Staff** | `/staff` | Staff shell (Home, Projects, Members…) — dark green bar, workspaces as tabs |

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
| **27 - Member Portal Parent Support Guide** | Everyone helping parents | Walk a parent through portal screens |

## Parents / families

| Doc | Who | What |
|-----|-----|------|
| **35 - Membership Tiers Reef · Lagoon · Tide** | Parents (board review) | Join/upgrade naming and portal tips |
| Portal Help panel | Members | In-app FAQ on `/member-portal` |

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
