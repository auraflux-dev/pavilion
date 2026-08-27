# Staff form queues vs CMS backends

Audience: product

## Model

See **[PAVILION-CMS.md](./PAVILION-CMS.md)**. Pavilion CMS (Postgres) is authoritative. SHMS publishes by syncing Pavilion CMS → Wix, then promoting staff code.

## Form / submission queues

| Source | Store | Staff today | Notes |
|--------|-------|-------------|-------|
| `/volunteer` | Wix `Volunteers` (SHMS) / `cms_form_submissions` (next) | Staff → Volunteers on SHMS; Pavilion demo stub | Move to Pavilion CMS form table next |
| `/contact` + portal help | Wix `ContactSubmissions` | CMS_ONLY list | Next Staff forms inbox on Pavilion CMS |
| Page / settings / nav | Pavilion `cms_*` when commons DB on; else Wix | Staff page copy / site settings / NavLinks | v1 CMS slice shipped |

## P0 backlog

1. Live `sync-pavilion-cms-to-wix.mjs --apply` upserts
2. `cms_collection_items` for Board/FAQ/VolunteerOpportunities
3. `cms_form_submissions` + Staff queues for contact/volunteer
4. Export Staff action (download CMS JSON for SHMS sync)
