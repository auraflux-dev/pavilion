# Wix (backend) vs Vercel (lightweight UX)

**Principle:** Wix owns content, catalog, members, orders, and most data. Vercel Next.js is a thin presentation + glue layer (auth cookies, checkout redirect, Square bridge, webhooks). Prefer changing CMS / Catalog / SiteSettings over shipping frontend deploys.

---

## Already updatable from Wix (no Vercel deploy)

| Wix source | What it drives |
|------------|----------------|
| **SiteSettings** | Announcement, hero *numbers*, footer hours/email/socials, WhatsApp grade links (**shown only after free/paid member login** — hidden from visitors), membership shared benefits, volunteer benefits, fundraising goals/allocations, **catalog product/variant IDs + store-card amounts**, **`storeProductIds` / `spiritWearProductIds` allowlists**, home volunteer/community image URLs, **portal grades**, **contact emails/address/hours** |
| **PageContent** | Page heroes / marketing chrome (home, membership, events, programs, volunteer, board, contact, store, spirit-wear, fundraising, meetings, newsletter, member-portal) + home blocks (`home-volunteer`, `home-community`) + portal free/paid copy (`portal`) + portal hub UI labels (`portal-hub` keyed bullets) |
| **NavLinks** | Navbar + footer labels / order / visibility |
| **Programs** | Programs list + featured home cards (+ Cheddarup URL) |
| **MembershipTiers** + **FAQItems** | Membership page tiers/FAQ (marketing) |
| **BoardMembers** | `/board` |
| **VolunteerOpportunities** | Volunteer “ways to help” list **and** sign-up form dropdown options |
| **MeetingMinutes** | `/meetings` |
| **FundraisingCTAs** | Fundraising contribute cards |
| **Stores Catalog** | Product name/price/image/stock (store + spirit; visibility gated by SiteSettings ID lists) |
| **Wix Events** | Home + `/events` |
| **Members** | Login / signup accounts |
| **Students / Memberships / Enrollments / Payments** | Portal data, paid tier, history |
| **ParentMessages** | Instructor → parent notes in portal Calendar & Messages quadrant (`audience` = family/grade/all, or `parentEmail` / `studentId`) |
| **ProgramSessions** | Dated program meetings (`startAt` / `endAt` / `location` / `instructorName`) shown on portal calendar when student is enrolled |
| Form collections | Contact, newsletter, volunteer *submissions* |

### Catalog keys (SiteSettings)

| Key | Purpose |
|-----|---------|
| `membershipRubyProductId` / `membershipRubyVariantId` | Ruby checkout |
| `membershipSupremeProductId` / `membershipSupremeVariantId` | Supreme checkout |
| `storeCardProductId` | Store card product |
| `storeCardVariant10` / `20` / `25` | Amount → variant UUID |
| `storeCardAmounts` | Comma list, e.g. `10,20,25` (must match variant keys) |
| `storeCardSlug` / `membershipRubySlug` / `membershipSupremeSlug` | Legacy product-page helpers |
| `storeProductIds` | Comma-separated Catalog UUIDs shown on `/store` (and counted in fundraising “store”) |
| `spiritWearProductIds` | Comma-separated Catalog UUIDs shown on `/spirit-wear` (and fundraising “spirit wear”) |
| `homeVolunteerImageUrl` / `homeVolunteerImageAlt` / `homeVolunteerSecondaryCta` | Home volunteer block media + secondary button label |
| `homeCommunityImageUrl` / `homeCommunityImageAlt` | Home community strip image |
| `portalGrades` | e.g. `6,7,8` |
| `contactEmailGeneral` / `contactEmailTreasurer` / `contactAddress` / `contactStoreHours` | Contact page |

**Add a store or spirit product:** create it in Wix Stores Catalog → copy the product UUID → append it to `storeProductIds` or `spiritWearProductIds` in SiteSettings (comma-separated). No Vercel deploy needed after CMS revalidate (~5 min).

Code fallbacks remain in `frontend/lib/defaults/catalog.ts` if a key is missing.

### PageContent fields

`page` (slug), `eyebrow`, `title`, `body`, `sectionTitle`, `sectionBody`, `bullets` (newline-separated; store-how uses `step\|title\|body`), `ctaLabel`, `ctaHref`, `active`.

Special pages:
- `home-volunteer` — home volunteer section (`bullets` = benefit list; `sectionTitle`/`sectionBody` = quote + attribution; CTAs via `ctaLabel`/`ctaHref`)
- `home-community` — home community strip headline (`title`)
- `member-portal` — hero title/body
- `portal` — free/paid account blurbs (`title`/`body` = free, `sectionTitle`/`sectionBody` = paid); bullets line 1–3 = empty-student title/body + upgrade blurb
- `portal-hub` — quadrant titles, empty states, CTAs as `key|text` lines in **Bullets** (e.g. `calendarTitle|Calendar & Messages`)
- `store` / `store-how` / `store-cta`

**Seed / refresh CMS rows:**

```bash
node --env-file=frontend/.env.local scripts/seed-cms-content.mjs
```

---

## Locked in Vercel today (needs code deploy)

PTO-facing write-up (Google Drive Tech Ops): **22 - Vercel Only — Cursor Code vs Dashboard** — splits (A) Cursor/git changes vs (B) Vercel Dashboard (env, domains, aliases, cron). Short checklist: doc **09 v3**.

### Member journey

| Piece | Why it’s on Vercel |
|-------|--------------------|
| OAuth login / callback / cookies / portal middleware | Session glue to headless site |
| Headless `/api/checkout/start` | Creates Wix checkout + redirect URL (IDs from SiteSettings) |
| Membership claim / order webhook / cron sync | Maps paid order → `Students.membershipTier` |
| **Square gift card** APIs + webhook + auto top-off UI options | Entire Square integration lives on Vercel |
| Faculty “Email to Join” | No catalog product; mailto only |

### Public UX still partly coded

| Piece | Notes |
|-------|--------|
| Brand colors / fonts / layout chrome | Design system on Vercel |
| Fundraising school-year window + event-ticket product maps | Dates + dance/NOVA ID sets still in code |
| Routes themselves (`/membership`, `/member-portal`, …) | Next App Router |

### Ops glue (belongs on Vercel by nature)

Webhooks (`wix-orders`, `cheddarup`, `square`), cron sync, `NEXT_PUBLIC_*` / secrets.

---

## Member experience map

```
Anon pages (Wix content + code chrome)
  → Log in (Vercel OAuth → Wix Members UI → Vercel callback)
  → Member portal (Vercel shell + Wix Students/Memberships + PageContent copy)
  → Join Ruby/Supreme (Vercel checkout API → Wix hosted pay; IDs from SiteSettings)
  → Tier applied (Vercel webhook/cron/claim → Wix CMS)
  → Store card (amounts/variants from SiteSettings → Wix checkout; Square on Vercel)
```

---

## Move to Wix next (thin-shell roadmap)

1. ~~**SiteSettings `storeProductIds` / `spiritWearProductIds`**~~ ✅ (Catalog tags optional later)  
2. ~~**SiteSettings keys for membership + store-card product/variant IDs**~~ ✅  
3. ~~**SiteSettings / PageContent for hero/contact/store-card/portal/home blocks**~~ ✅  
4. ~~**Volunteer form options ← VolunteerOpportunities**~~ ✅  
5. **Fundraising year + dance/NOVA product maps → SiteSettings**  
6. **Portal perk bullets ← MembershipTiers** (same source as marketing page)

Square + OAuth + webhooks stay on Vercel; they are integration glue, not “content.”
