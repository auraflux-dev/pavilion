# Commons cost envelopes vs $399/mo

Source of truth in code: `frontend/lib/ops/commons-cost-sheet.ts`.

- List price: $399/school/month.
- Fixed platform ~$110/mo (Render Pro workspace $25 when upgraded, Basic-1gb $19 + storage headroom, Vercel band, R2, probe, email). Hobby workspace today still bills the new **commons-prod** Basic-1gb (~$19) without the $25 Pro PITR pack.
- Plaid: SHMS Production dashboard rate was **not readable from this repo**. Set `PLAID_TRANSACTIONS_ITEM_USD_MONTH` on Vercel from Plaid Billing (Transactions per Item). Until then the sheet uses the mid of the $15–40 planning band ($27.50).
- Square: $0 to Auraflux (school pays processing + 2.5% gift-card load).
- Envelopes (with band-mid Plaid): 1 school ~$138 infra; 10 ~$385; 100 ~$2,860. Revenue $399 / $3,990 / $39,900. Plaid dominates at 100 if every school has a bank Item; Square-only schools skip Plaid.
- Trial Plaid cap is 10 Items — paid Plaid before school 11.
