# Pavilion CMS (authoritative)

Audience: product

## Model

| Layer | Role |
|-------|------|
| **Pavilion CMS** (Postgres `cms_*` tables, org-scoped) | Source of truth for content + form queues for demo, trials, and all Pavilion-hosted customers |
| **Staff UI / APIs** | Always author in `~/pavilion`; read/write Pavilion CMS when `DATABASE_URL` + commons platform |
| **SHMS (VIP)** | Still publishes via **Wix** today. After content is correct in Pavilion CMS, **sync/commit those rows into Wix CMS** and promote staff code to `~/shmspto` |

```mermaid
flowchart LR
  staff[Staff_UI_pavilion]
  cms[Pavilion_CMS_Postgres]
  demo[commons_pto_demo]
  sync[sync_to_Wix]
  wix[Wix_CMS_SHMS]
  www[www_shmspto_org]

  staff --> cms
  cms --> demo
  cms --> sync
  sync --> wix
  wix --> www
```

## Tables (v1)

- `cms_site_settings` — key/value
- `cms_page_content` — PageContent-shaped rows
- `cms_nav_links` — NavLinks
- `cms_collection_items` — generic collections (Board, FAQ, …) next
- `cms_form_submissions` — volunteer/contact queues next

Schema: [`frontend/lib/cms/schema-sql.ts`](../frontend/lib/cms/schema-sql.ts)  
Store: [`frontend/lib/cms/store.ts`](../frontend/lib/cms/store.ts)

## SHMS publish path

1. Edit content in Pavilion Staff (demo or a Stone Hill org row in Pavilion CMS).
2. Run sync to Wix (script / Staff action; Wix keys only on shmspto / Doppler `shmspto/prd`):

```bash
# from ~/shmspto with Wix creds — pushes Pavilion CMS export JSON into Wix
bash scripts/doppler_prd.sh node scripts/sync-pavilion-cms-to-wix.mjs --org org_riverside --from-file ./tmp/cms-export.json
```

3. Promote/ship staff code: `node scripts/promote-to-shms.mjs` then `ship-stone-hill.mjs` when product UI changed.

Do **not** treat Wix as the place to author shared product content long-term. Pavilion CMS is authoritative; Wix is the SHMS publish connector until cutover.

## Platform owners vs customer staff

| Actor | Email | Scope |
|-------|--------|--------|
| **Pavilion platform owner** | `@onpavilion.com` (e.g. `robert@onpavilion.com`) | Overarching CMS admin. Can switch customer org and edit that org’s Pavilion CMS. |
| **Customer staff** | Per-school (e.g. `@shmspto.org` on SHMS) | Staff for **one** organization only |

Platform owners are seeded in `platform_owners` + person/staff on `org_pavilion`. Staff UI shows **Pavilion platform CMS** org switcher when `platformOwner` is true.

Staff product app is **commons-pto-demo** / platform hosts (not marketing commons-site alone). Create the Google Workspace mailbox `robert@onpavilion.com` in ops; code already recognizes `@onpavilion.com` as platform staff.

