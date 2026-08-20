Commons sales prospects live on **commons-prod** only, table `pto_prospects` (platform, no organization_id).

- Script: `scripts/sales/pto-prospect-propublica.mjs`
- Source: ProPublica Nonprofit Explorer API (public 990)
- Floor: `totrevenue >= 50000`
- **Year/revenue:** prefer `organization.tax_period` + `organization.revenue_amount` (matches ProPublica org page defaults). Fall back to `filings_with_data` extracts when org summary missing.
- `--year` is a **floor** (keep latest year >= value). Default calendar year − 2 (so 2024 and 2025 both keep when present).
- Refuses commons-crm (demo), auraflux-pg, and non-prod URLs
- Never Stone Hill / Wix

Env: `COMMONS_PROD_DATABASE_URL` or `COMMONS_PROD_DATABASE_URL_FILE`.

Note: parsed filings can lag the org page (e.g. Colvin Run page shows 2025 / $168k while extract still has 2024 / $215k).

Expand: `--states=VA,MD,NC --min=50000`