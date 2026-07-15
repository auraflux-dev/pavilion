# Wix (backend) vs Vercel (lightweight UX)

**Principle:** Wix owns content, catalog, members, orders, and most data. Vercel Next.js is a thin presentation + glue layer (auth cookies, checkout redirect, Square bridge, webhooks). Prefer changing CMS / Catalog / SiteSettings over shipping frontend deploys.

---

## Already updatable from Wix (no Vercel deploy)

| Wix source | What it drives |
|------------|----------------|
| **SiteSettings** | Announcement, hero *numbers*, footer hours/email/socials, WhatsApp grade links (**shown only after free/paid member login** — hidden from visitors), membership shared benefits, volunteer benefits, fundraising goals/allocations, **catalog product/variant IDs + store-card amounts**, **portal grades**, **contact emails/address/hours** |
| **PageContent** | Page heroes / marketing chrome (home, membership, events, programs, volunteer, board, contact, store, spirit-wear, fundraising, meetings, newsletter, member-portal) + portal free/paid copy (`portal`) + portal hub UI labels (`portal-hub` keyed bullets) |
| **NavLinks** | Navbar + footer labels / order / visibility |
| **Programs** | Programs list + featured home cards (+ Cheddarup URL) |
| **MembershipTiers** + **FAQItems** | Membership page tiers/FAQ (marketing) |
| **BoardMembers** | `/board` |
| **VolunteerOpportunities** | Volunteer “ways to help” list |
| **MeetingMinutes** | `/meetings` |
| **FundraisingCTAs** | Fundraising contribute cards |
| **Stores Catalog** | Product name/price/image/stock (store + spirit, after allowlist) |
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
| `portalGrades` | e.g. `6,7,8` |
| `contactEmailGeneral` / `contactEmailTreasurer` / `contactAddress` / `contactStoreHours` | Contact page |

Code fallbacks remain in `frontend/lib/defaults/catalog.ts` if a key is missing.

### PageContent fields

`page` (slug), `eyebrow`, `title`, `body`, `sectionTitle`, `sectionBody`, `bullets` (newline-separated; store-how uses `step\|title\|body`), `ctaLabel`, `ctaHref`, `active`.

Special pages:
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

### Member journey

| Piece | Why it’s on Vercel |
|-------|--------------------|
| OAuth login / callback / cookies / portal middleware | Session glue to headless site |
| Headless `/api/checkout/start` | Creates Wix checkout + redirect URL (IDs from SiteSettings) |
| Membership claim / order webhook / cron sync | Maps paid order → `Students.membershipTier` |
| **Square gift card** APIs + webhook + auto top-off UI options | Entire Square integration lives on Vercel |
| School-store + spirit-wear **product ID allowlists** | New catalog items stay hidden until code updated (or CMS tags later) |
| Faculty “Email to Join” | No catalog product; mailto only |

### Public UX still partly coded

| Piece | Notes |
|-------|--------|
| Brand colors / fonts / layout chrome | Design system on Vercel |
| Home volunteer + community sections | Still hardcoded below hero |
| Volunteer form opportunity dropdown | Separate list from CMS opportunities |
| Fundraising year window + initiative blurbs + which products count toward which goal | Hardcoded ID maps + dates |
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

1. **Product groups in CMS or Catalog tags** — drop `SHMS_PRODUCT_IDS` / spirit allowlists  
2. ~~**SiteSettings keys for membership + store-card product/variant IDs**~~ ✅  
3. ~~**SiteSettings / PageContent for hero/contact/store-card/portal copy**~~ ✅  
4. **Volunteer form options ← VolunteerOpportunities** only  
5. **Fundraising year + goal product maps → SiteSettings**  
6. **Portal perk bullets ← MembershipTiers** (same source as marketing page)

Square + OAuth + webhooks stay on Vercel; they are integration glue, not “content.”
