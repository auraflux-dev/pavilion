# Pavilion Brand Staff SEO + Brand SMOKE

Run on commons-pto-demo as a platform owner (`@onpavilion.com` or demo admin).

## Staff shell

- [ ] `/staff?view=seo` opens SEO (fleet mode, not Client Staff)
- [ ] `/staff/seo` redirects to the same view
- [ ] `/staff?view=strategy` opens Brand strategy
- [ ] `/staff/brand` redirects to strategy (not visual Brand)
- [ ] `/staff?view=diagnostics` shows env probes
- [ ] Social and Ads show Coming soon
- [ ] Client Staff `/staff?view=brand` still edits logo/colors

## SEO

- [ ] Settings saves origin/domain
- [ ] Run crawl against the origin (or a public site). Report stores.
- [ ] GSC: if `SEO_GOOGLE_CLIENT_*` (or `GOOGLE_CLIENT_*`) **unset**, diagnostics and SEO settings show the exact blocked env copy
- [ ] GSC: if set, Connect Google → consent → return `oauth=connected`
- [ ] Pull GSC lists queries
- [ ] Seed blog drafts creates unpublished MarketingBlogPosts
- [ ] Invite link `/seo-connect?token=` peeks without staff cookie

## Brand

- [ ] Follow-ups then Generate (placeholder if no `OPENAI_API_KEY`)
- [ ] Approve → `GET /api/staff/brand/active` returns the kit
- [ ] Export downloads `*-guidelines.md`

## Diagnostics

- [ ] `composio: false`, `dataForSeo: false`
- [ ] Database on when `DATABASE_URL` is set

## Do not

- Mix treasurer Vercel
- Enable Composio
- Treat this demo ship as www.shmspto.org
