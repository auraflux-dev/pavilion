# Pavilion marketing ops (onpavilion.com)

**Audience: product**

## Contact

| Channel | Value |
|---------|--------|
| Email | `hello@onpavilion.com` |
| Call / SMS | `+1 (571) 600-2835` (`tel:+15716002835`) |

## UptimeRobot API key

Put the key in **Doppler** project `pavilion` / config `dev` as:

```text
UPTIMEROBOT_API_KEY
```

Agents and ops scripts read it from Doppler (same pattern as `VERCEL_TOKEN`).

```bash
# one-shot monitor create (idempotent)
./scripts/doppler_run.sh node scripts/setup-uptimerobot-pavilion.mjs
```

Do **not** put this key in git. It is **not** required on Vercel `commons-site` runtime. Monitors already created in the UptimeRobot UI do not need the script again unless you want the scripted set.

If the same UptimeRobot account also covers SHMS, you may reuse one key in both `pavilion/dev` and `shmspto` Doppler. Prefer one account, clear monitor names (`Pavilion — …` vs `SHMS — …`).

## DNS (Cloudflare preferred)

**Policy:** authoritative DNS for `onpavilion.com` should live on **Cloudflare**, not Vercel NS.

Today (before cutover): NS is still `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (registrar Name.com).

### Records to recreate in Cloudflare (DNS only / grey cloud for Vercel hosts)

Proxy status: **DNS only** for hosts that terminate on Vercel (avoids double-proxy TLS issues).

| Type | Name | Content / target | Notes |
|------|------|------------------|--------|
| A | `@` | `216.150.16.129` | Current apex (Vercel). Re-check in Vercel Domains if IPs change. |
| A | `@` | `216.150.1.1` | Second apex A |
| A | `www` | `216.150.1.65` | Or CNAME `www` → `cname.vercel-dns.com` if Vercel shows CNAME |
| A | `www` | `216.150.1.193` | Second www A if using A records |
| A | `demo` | `216.150.16.1` | Or CNAME → `cname.vercel-dns.com` |
| A | `demo` | `216.150.1.193` | Second demo A if using A records |
| CNAME | `*` | `cname.vercel-dns.com` | Trial hosts `{slug}.onpavilion.com`. Required for wildcards. |
| MX | `@` | `smtp.google.com` priority `1` | Google Workspace |
| TXT | `_vercel` | `vc-domain-verify=www.onpavilion.com,db5e500ef5c74d26a150` | Keep all verify rows Vercel shows |
| TXT | `_vercel` | `vc-domain-verify=onpavilion.com,c38d4f1ff4bf10d945d0` | |
| TXT | `_vercel` | `vc-domain-verify=demo.onpavilion.com,12bdeabef8f3abb21a0f` | |
| TXT | `_vercel` | `vc-domain-verify=blank-school.onpavilion.com,d5cecb1c8fcbc4f55a0f` | Plus any new trial verifies |
| TXT | `_vercel` | `google-site-verification=dNcAyv413sP5-AhP8Du6XOyZhgkmGWiyj7qAL-FKQuY` | Google site verify (currently on `_vercel`) |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | Add if missing after cutover |

Optional later: DKIM CNAMEs from Google Admin.

### Cutover steps

1. Add zone `onpavilion.com` in Cloudflare (API token from Doppler if present as `CLOUDFLARE_API_TOKEN` / account id, or dashboard).
2. Import / paste the table above. CF will **not** auto-port every Vercel private verify TXT. Copy `_vercel` TXT rows from live DNS or Vercel Domains UI.
3. At **Name.com**, set NS to the two Cloudflare nameservers CF assigns.
4. Wait for NS propagation. Confirm `dig NS onpavilion.com` shows Cloudflare.
5. In Vercel (`commons-site` + `commons-pto-demo`), re-verify domains if prompted.
6. Keep `*.onpavilion.com` working before selling new trials.

**Wildcard note:** Vercel’s easiest wildcard path is Vercel NS. On Cloudflare you must keep the `*` CNAME to `cname.vercel-dns.com` (DNS only) and complete any TXT challenges Vercel requests.

Cloudflare R2 (`R2_*`) is storage for backups/media. That is separate from DNS.

## GA4

Set on Vercel project **commons-site** (Production):

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Loaded by `commons-site/components/google-analytics.tsx`. Skips localhost, `*.vercel.app`, and `?ga_opt_out=1`.

## Security

- App headers in `commons-site/next.config.ts` (frame deny, nosniff, referrer, permissions, CSP)
- Vercel HSTS on the domain
- Public `/.well-known/security.txt`

## Backups

| Layer | Role |
|-------|------|
| Neon PITR (`commons-prod`) | Primary for subscription / account-token tables |
| Stripe | Billing source of record |
| Nightly cron `GET /api/ops/db-heartbeat` | Heartbeat + row counts (Bearer `CRON_SECRET`) |

Set `CRON_SECRET` on commons-site Production so Vercel Cron can call the route (`commons-site/vercel.json`).

## Uptime

Monitors (5 min): Home, `/api/health`, Pricing, Contact, `security.txt`.

Script (after Doppler key is set):

```bash
./scripts/doppler_run.sh node scripts/setup-uptimerobot-pavilion.mjs
```

## Blog / local SEO

See `docs/PAVILION-BLOG-SEO-CALENDAR.md`. Named case study on `/work`: Stone Hill Middle School PTO only.
