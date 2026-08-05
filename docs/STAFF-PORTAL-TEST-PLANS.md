# Staff Portal & Session Gaps. Test Plans (July 2026)

Covers every gap from the portal / board-roles / social / payments session.

## Gap coverage map

| Gap | Build | Test plan |
|-----|-------|-----------|
| Parent member-only portal | Existing + staff link when eligible | TP-M |
| Admin lookup every member | `/staff` Admin + `/api/staff/members` | TP-A |
| Admin act-as parent | Act-as cookie + portal banner | TP-A |
| Admin manages staff access | `/staff` Staff Access + `/api/staff/roles` | TP-R |
| Marketing FB/IG from portal | `/staff` Marketing compose | TP-K |
| Legal docs | `/privacy`, `/terms`, `/photo-release` | TP-L |
| Instructor → parent messaging | `/staff` Programs compose → ParentMessages | TP-I |
| Board role homes | Staff shell panels per system role | TP-S |
| Surveys + card-on-file + board Drive docs | Prior session + docs 23 to 26 | TP-E / TP-C / docs |
| Survey sharing, review, CSV export | `/staff` Surveys + `/api/staff/surveys` | TP-E |

---

## TP-S. Staff shell & RBAC

| # | Test | Pass |
|---|------|------|
| S.1 | Member with no StaffRoles row cannot open `/staff` (redirect or 403) | |
| S.2 | StaffRoles row with `roles=marketing` sees Marketing home only (not Admin act-as) | |
| S.3 | `roles=admin` sees all panels | |
| S.4 | Multi-role `marketing,programs` shows both panels | |
| S.5 | Board public `/board` still shows display titles from BoardMembers (unchanged) | |
| S.6 | Navbar/footer link to Staff appears only when `staffRoles.length > 0` | |

## TP-A. Admin lookup & act-as

| # | Test | Pass |
|---|------|------|
| A.1 | Admin search by email/name returns matching Students parents | |
| A.2 | Non-admin calling `/api/staff/members` → 403 | |
| A.3 | Act-as sets cookie; `/member-portal` shows that parent's students/messages | |
| A.4 | Act-as banner visible; Exit returns to admin's own portal data | |
| A.5 | Act-as does not grant staff APIs as the parent (staff session remains admin) | |
| A.6 | Non-admin cannot set act-as cookie | |
| A.7 | Admin archives a student; student disappears from parent portal but remains searchable as Archived | |
| A.8 | Archive disables auto top-off and blocks reload/balance/settings APIs | |
| A.9 | Admin restores a student; student returns to parent portal | |

## TP-R. Admin staff access

| # | Test | Pass |
|---|------|------|
| R.1 | Admin can list current staff access rows | |
| R.2 | Admin can assign one or more valid system roles to an `@shmspto.org` email | |
| R.3 | Personal/non-domain email is rejected | |
| R.4 | Admin can deactivate and reactivate staff access | |
| R.5 | Non-admin receives 403 from `/api/staff/roles` | |

## TP-K. Marketing social compose

| # | Test | Pass |
|---|------|------|
| K.1 | Marketing role can open compose form for facebook / instagram | |
| K.2 | When `socialPublishEnabled=false`, publish returns clear not-connected message | |
| K.3 | Draft saved to SocialPosts CMS (status draft or queued) | |
| K.4 | Non-marketing non-admin → 403 on `/api/staff/social` | |
| K.5 | After FB/IG connect + flag true, publish path is ready (manual E2E) | |

## TP-L. Legal docs

| # | Test | Pass |
|---|------|------|
| L.1 | `/privacy`, `/terms`, `/photo-release` render CMS PageContent (or defaults) | |
| L.2 | Footer links to all three | |
| L.3 | Board can edit copy in PageContent without deploy | |

## TP-I. Instructor / programs messaging

| # | Test | Pass |
|---|------|------|
| I.1 | Programs or instructor role can send ParentMessages | |
| I.2 | Audience filters: specific parentEmail, grade, programName, or all | |
| I.3 | Parent sees message in portal Messages quadrant | |
| I.4 | Non-staff → 403 on send API | |

## TP-M. Member portal (parent)

| # | Test | Pass |
|---|------|------|
| M.1 | Anonymous → login redirect for `/member-portal` and `/staff` | |
| M.2 | Edit account / students still works | |
| M.3 | Surveys list + help panel present | |
| M.4 | Store card reload requires student + amount | |

## TP-C. Card-on-file / auto top-off (prior build)

| # | Test | Pass |
|---|------|------|
| C.1-C.7 | See `docs/PARENT-PORTAL-PLAN.md` TP-C | |

## TP-E. Surveys

| # | Test | Pass |
|---|------|------|
| E.1 | Marketing/secretary/admin can list active surveys | |
| E.2 | Email, SMS, and WhatsApp actions include the branded survey URL and channel | |
| E.3 | Response table filters by survey | |
| E.4 | CSV download includes respondent metadata and all answer columns | |
| E.5 | Other staff roles receive 403 from `/api/staff/surveys` | |
| E.6 | Parent submission tests: see `docs/PARENT-PORTAL-PLAN.md` TP-E | |

## TP-ONB. Role onboarding (Marketing · Secretary · Treasurer)

| # | Test | Pass |
|---|------|------|
| O.1 | Staff with marketing role sees Marketing onboarding on Home | |
| O.2 | Secretary / treasurer see their tracks; unrelated roles see none | |
| O.3 | Admin sees all three tracks | |
| O.4 | Mark done persists after refresh; Undo clears | |
| O.5 | Personal email + Google Connect auto-complete when already set | |
| O.6 | Workspace buttons navigate to the correct Staff tab | |
| O.7 | Unauthenticated `/api/staff/onboarding` → 403 | |

## TP-COMMS. Comms & content calendar + Projects calendar

| # | Test | Pass |
|---|------|------|
| C.1 | Marketing/secretary/membership/events see **Comms & content** nav; other roles do not | |
| C.2 | Month grid shows Mon–Sun; Today / prev / next change month | |
| C.3 | Click a day prefills publish datetime on the add form | |
| C.4 | Communications vs Content planner tabs filter items by `kind` | |
| C.5 | Create item → appears on correct day chip; Edit + Mark published works | |
| C.6 | Open Newsletter / Social deep-links from channel | |
| C.7 | Unauthenticated `GET/POST /api/staff/comms-calendar` → 403 | |
| C.8 | Projects → **Calendar** plots tasks by due date; undated list shows | |

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

Assign in `/staff` → **Admin · Staff access**. Wix CMS `StaffRoles` remains the underlying collection.
