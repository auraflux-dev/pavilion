# Staff Portal & Session Gaps — Test Plans (July 2026)

Covers every gap from the portal / board-roles / social / payments session.

## Gap coverage map

| Gap | Build | Test plan |
|-----|-------|-----------|
| Parent member-only portal | Existing + staff link when eligible | TP-M |
| Admin lookup every member | `/staff` Admin + `/api/staff/members` | TP-A |
| Admin act-as parent | Act-as cookie + portal banner | TP-A |
| Marketing FB/IG from portal | `/staff` Marketing compose | TP-K |
| Legal docs | `/privacy`, `/terms`, `/photo-release` | TP-L |
| Instructor → parent messaging | `/staff` Programs compose → ParentMessages | TP-I |
| Board role homes | Staff shell panels per system role | TP-S |
| Surveys + card-on-file + board Drive docs | Prior session + docs 23–26 | TP-E / TP-C / docs |

---

## TP-S — Staff shell & RBAC

| # | Test | Pass |
|---|------|------|
| S.1 | Member with no StaffRoles row cannot open `/staff` (redirect or 403) | |
| S.2 | StaffRoles row with `roles=marketing` sees Marketing home only (not Admin act-as) | |
| S.3 | `roles=admin` sees all panels | |
| S.4 | Multi-role `marketing,programs` shows both panels | |
| S.5 | Board public `/board` still shows display titles from BoardMembers (unchanged) | |
| S.6 | Navbar/footer link to Staff appears only when `staffRoles.length > 0` | |

## TP-A — Admin lookup & act-as

| # | Test | Pass |
|---|------|------|
| A.1 | Admin search by email/name returns matching Students parents | |
| A.2 | Non-admin calling `/api/staff/members` → 403 | |
| A.3 | Act-as sets cookie; `/member-portal` shows that parent's students/messages | |
| A.4 | Act-as banner visible; Exit returns to admin's own portal data | |
| A.5 | Act-as does not grant staff APIs as the parent (staff session remains admin) | |
| A.6 | Non-admin cannot set act-as cookie | |

## TP-K — Marketing social compose

| # | Test | Pass |
|---|------|------|
| K.1 | Marketing role can open compose form for facebook / instagram | |
| K.2 | When `socialPublishEnabled=false`, publish returns clear not-connected message | |
| K.3 | Draft saved to SocialPosts CMS (status draft or queued) | |
| K.4 | Non-marketing non-admin → 403 on `/api/staff/social` | |
| K.5 | After FB/IG connect + flag true, publish path is ready (manual E2E) | |

## TP-L — Legal docs

| # | Test | Pass |
|---|------|------|
| L.1 | `/privacy`, `/terms`, `/photo-release` render CMS PageContent (or defaults) | |
| L.2 | Footer links to all three | |
| L.3 | Board can edit copy in PageContent without deploy | |

## TP-I — Instructor / programs messaging

| # | Test | Pass |
|---|------|------|
| I.1 | Programs or instructor role can send ParentMessages | |
| I.2 | Audience filters: specific parentEmail, grade, programName, or all | |
| I.3 | Parent sees message in portal Messages quadrant | |
| I.4 | Non-staff → 403 on send API | |

## TP-M — Member portal (parent)

| # | Test | Pass |
|---|------|------|
| M.1 | Anonymous → login redirect for `/member-portal` and `/staff` | |
| M.2 | Edit account / students still works | |
| M.3 | Surveys list + help panel present | |
| M.4 | Store card reload requires student + amount | |

## TP-C — Card-on-file / auto top-off (prior build)

| # | Test | Pass |
|---|------|------|
| C.1–C.7 | See `docs/PARENT-PORTAL-PLAN.md` TP-C | |

## TP-E — Surveys (prior build)

| # | Test | Pass |
|---|------|------|
| E.1–E.5 | See `docs/PARENT-PORTAL-PLAN.md` TP-E | |

## Board role → system role (assignment checklist)

| Board title | System roles |
|-------------|--------------|
| President | admin |
| Secretary | secretary |
| Treasurer | treasurer |
| Co-VP Events | events |
| VP Marketing | marketing |
| Co-VPs Fundraising & Programs | programs |
| Teacher & Staff Wellness | wellness |
| VP Membership Experience | membership |
| VP Digital & Retail Sales | retail |
| Program instructor (non-board) | instructor |

Assign in CMS **StaffRoles** (`email` + comma-separated `roles`).
