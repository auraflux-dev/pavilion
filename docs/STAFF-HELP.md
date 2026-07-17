# Staff help docs (July 2026)

Canonical copies live in Google Drive → **SHMS PTO Platform Docs**.  
Staging: https://shmspto.vercel.app/staff

## Audience shells (who you are)

| Audience | Where | Top nav |
|----------|--------|---------|
| **Visitor** | Public pages | Marketing CMS nav + Log in |
| **Free / paid member** | `/member-portal` | Member shell (My portal, Upgrade/Membership, Store, Programs) — not marketing nav |
| **Staff** | `/staff` | Staff shell (Home, Projects, Members…) — dark green bar, workspaces as tabs |

Browsing the public site while logged in still uses the marketing nav (with a Free/Paid/Visitor hint). Portal and Staff never reuse that bar.

## Staff portal — start here

| Doc | Who | What |
|-----|-----|------|
| **30 - Staff Portal Quick Start** | Everyone | Sign-in, what each panel is, first-week checklist |
| **26 - Staff Roles & Portal Workspaces** | Everyone / admin | `@shmspto.org` vs personal email, roles, self-registration |
| **29 - Staff Year Project Board** | Everyone | Year swimlanes, projects, assign tasks to people |
| **31 - Admin Lookup, Act-as & Student Archive** | Admin | Search parents, act-as, archive/restore students |
| **27 - Member Portal Parent Support Guide** | Everyone helping parents | Walk a parent through portal screens |

## Role-specific on Staff

| Doc | Role | What |
|-----|------|------|
| **16** | Programs / instructor / secretary | Parent portal inbox messages |
| **23–24** | Marketing / secretary | Surveys create, share, review, CSV |
| **25** | Marketing | Facebook publish from Staff (IG when second social slot) |
| **12b** | Treasurer / support | Store card, auto top-off, Needs Reconciliation |

## Gaps this set closes (July 17, 2026)

- Year project board with swimlanes + person assignment (was missing; now doc 29)
- Staff “START HERE” map of `/staff` panels (doc 30)
- Admin archive / act-as how-to as its own guide (doc 31)
- Index lists Staff docs separately from Tech Ops / Wix CMS guides

## Publish / refresh Drive

```bash
node --env-file=frontend/.env.local scripts/create-pto-docs.js
```
