# Parent Portal & Surveys — Locked Plan (July 2026)

Decisions from product review, with test plans for execution.

## Locked decisions

| # | Decision |
|---|----------|
| 1 | **Both** money paths: prepaid reload plus Square card-on-file for optional auto top-off |
| 2 | **In-portal edit only** — never link parents out to Wix profile |
| 3 | General FAQ on the page it applies to; **portal-specific help only inside `/member-portal`** |
| 4 | **Branded embedded surveys** on `shmspto.org/survey/{slug}` — share same URL via email/SMS/WhatsApp; responses in `SurveyResponses` CMS |
| 5 | **Social**: code config + publish stub now; connect FB/IG in Wix when accounts exist |

---

## Workstreams & status

### A — Money (both paths)

| Item | Phase | Status |
|------|-------|--------|
| Copy: store card vs checkout vs no card-on-file | 1 | **Done** — portal copy + auto top-off honesty |
| Load card help in Store quadrant | 1 | **Done** |
| Card-on-file + charge for auto top-off | 2 | **Done in code** — Square Web Payments SDK + Cards API |
| Student-scoped reload | 2 | **Done in code** — required student picker before payment |
| Production payment test | 2 | Pending — requires signed-in parent and real/test card |

### B — In-portal profile & household

| Item | Status |
|------|--------|
| Edit profile (name, phone) | **Done** — `PATCH /api/auth/profile` |
| Edit student (name, grade) | **Done** — `PATCH /api/students/[id]` |
| Add student | Already existed |
| My Account → Manage students link | **Done** |
| Return anytime hub | `/member-portal` |

### C — Portal help (placement)

| Item | Status |
|------|--------|
| `portal-help` PageContent (question\|answer) | **Done** — seed + defaults |
| Collapsible help panel in portal | **Done** |
| Board edits via CMS without deploy | **Done** |

### D — Surveys & data

| Item | Status |
|------|--------|
| `Surveys` + `SurveyResponses` CMS collections | **Done** — seed script |
| Branded `/survey/[slug]` page | **Done** |
| Portal survey list | **Done** |
| Board creates survey in CMS (fields JSON) | **Done** — manual CMS for now |
| Staff share center for email/SMS/WhatsApp | **Done** — `/staff` opens or copies branded channel messages |
| Review responses in staff portal | **Done** — filterable response table for marketing/secretary/admin |
| CSV export | **Done** — `/api/staff/surveys?format=csv` |
| Export/analyze in Wix CMS | **Done** — SurveyResponses collection remains the source of truth |

**Survey share URL:** `https://shmspto.org/survey/{slug}?from=email|sms|whatsapp|portal`

**fieldsJson example:**
```json
[
  {"id":"grade","type":"choice","label":"Student grade","options":["6","7","8"],"required":true},
  {"id":"feedback","type":"textarea","label":"What would you like to see more of?","required":false}
]
```

### E — Social (code now, accounts later)

| Item | Status |
|------|--------|
| Site Settings: social URLs + page IDs + `socialPublishEnabled` | **Done** — seed |
| `lib/social/config.ts` + `publish.ts` stub | **Done** |
| Wix Dashboard connect FB/IG | **Waiting** — you create accounts |
| Board how-to for native Wix Social publish | **Done** — Drive doc 25 |

---

## Test plans

### TP-B — Portal edit

| # | Test | Pass |
|---|------|------|
| B.1 | Login → all 4 quadrants + help + surveys section | |
| B.2 | Edit profile → name updates without leaving portal | |
| B.3 | Add 2nd student → count updates | |
| B.4 | Edit student grade → saves, refresh persists | |
| B.5 | Wrong parent cannot PATCH another student | 404 |

### TP-C — Store card and saved payment

| # | Test | Pass |
|---|------|------|
| C.1 | Load card → choose student → choose amount → Square card form | |
| C.2 | One-time payment charges exactly selected amount and loads selected student | |
| C.3 | Save card stores only Square IDs + masked metadata (never PAN/CVV) | |
| C.4 | Saved card can be used for a later manual reload | |
| C.5 | Auto top-off cannot be enabled without a saved card | |
| C.6 | REDEEM at/below threshold charges saved card before loading gift card | |
| C.7 | Payment succeeds but load fails → `Needs Reconciliation`, no blind retry | |

### TP-D — Portal help

| # | Test | Pass |
|---|------|------|
| D.1 | Help panel only on `/member-portal` | |
| D.2 | CMS edit to `portal-help` bullets updates FAQ (~5 min) | |

### TP-E — Surveys

| # | Test | Pass |
|---|------|------|
| E.1 | Create survey in CMS → appears in portal list | **Passed locally** |
| E.2 | `/survey/{slug}` renders branded form on-site | **Passed locally** |
| E.3 | Submit → row in SurveyResponses with channel | **Passed locally** |
| E.4 | `?from=whatsapp` stored as channel | |
| E.5 | requireLogin survey redirects anon to login | |

### TP-F — Social stub

| # | Test | Pass |
|---|------|------|
| F.1 | Footer icons use Site Settings URLs when set | |
| F.2 | `publishSocialPost` returns clear “not connected” message | |
| F.3 | After Wix connect + `socialPublishEnabled=true`, wire real API | Phase 2 |

---

## Board docs

1. **23 - How to Create & Share a Branded Survey** — created  
2. **24 - How to Review and Export Survey Responses** — created  
3. **25 - How to Publish to Facebook and Instagram from Wix** — created  
4. **Parent portal help** — already in CMS `portal-help`; board can edit there  

---

## Provisioning completed

```bash
node --env-file=frontend/.env.local scripts/seed-cms-content.mjs
```

Collections and the `spring-feedback` survey were created July 2026. Re-run after schema/default changes.
