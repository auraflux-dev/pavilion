# Public Pavilion repo prep (safe checklist)

Goal: make Pavilion a **public** product repo under its **own GitHub org** (not AuraFlux).  
This doc is prep only — does **not** transfer the repo or touch www.shmspto.org.

## Already OK

- Root / frontend `.gitignore` covers `.env*`, `.vercel`, `tmp/`, local Doppler bootstrap
- Tracked examples only: `.env.example`, `.env.vercel.example`, `frontend/.env.example`
- Real `.env` / `.env.local` are ignored locally

## Before going public — scrub / confirm

Run from `~/pavilion`:

```bash
# Anything that looks like secrets still tracked?
git ls-files | rg -i 'secret|credential|token|\.pem|\.p12|service.account|\.env\.local'

# Confirm ignore
git check-ignore -v .env frontend/.env.local
```

### Must never be public

| Item | Notes |
|------|--------|
| `DOPPLER_TOKEN` / service tokens | Local `.env` only |
| `VERCEL_TOKEN` | Doppler `pavilion/dev` only |
| Customer connector secrets | Trial org DB / Vercel env — not in git |
| SHMS Wix / Square / Google SA | Stay on treasurer / shmspto — never copy into pavilion public tree |
| Real parent PII, school rosters | Demo fixtures only (Riverside sample) |
| Provision secrets (`COMMONS_PROVISION_SECRET`) | Vercel env, not repo |

### Review before public (content, not secrets)

| Path | Action |
|------|--------|
| `frontend/lib/crm/trial-packs/` | OK if sample brands only; strip real-school assets if any |
| `promo-videos/` | Large / possibly SHMS-branded — consider `export-ignore` or separate private media repo |
| `tmp/` audit CSVs already tracked | Prefer untrack + keep gitignored |
| `.serena/memories/` | Ops notes — keep private or scrub before public |
| `scripts/sales/` | Prospect exports — already `scripts/sales/out/` ignored; audit committed scripts |

## Suggested `.gitignore` tighten (optional, safe)

```gitignore
# Product sync stamp / local ops
tmp/
.serena/

# Never commit linked Vercel project metadata if regenerated
**/.vercel/
```

(`.serena/` may already be local-only in some clones — confirm before adding if you rely on committed memories.)

## Transfer order (later — Rob OK)

1. Create Pavilion GitHub org  
2. Transfer or mirror `auraflux-dev/pavilion`  
3. Set **public** after scrub  
4. Repoint robert-4220 Vercel Git remotes (`commons-pto-demo`, `commons-site`)  
5. Update `AGENT-SHIP-MAP.md` clone paths  
6. Leave `auraflux-dev` for AuraFlux video/tooling only  

**Do not** move `shmspto` or `lumi` in that step — they stay customer repos (private).
