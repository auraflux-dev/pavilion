Commons trial is a **private** school org (plan=trial, 30 days) on COMMONS_PLATFORM=true without DEMO_INSTANCE.

- Entire platform app requires Better Auth except `/login`, `/api/id`, `/api/cron/*`, and `/trial` (+ start API).
- Schools sign in at `/login` with email + password Auraflux provides. No public visitor site on trial.
- Provisioning: `/trial?key=COMMONS_PROVISION_SECRET` (or header `x-commons-provision-key`). Not self-serve for prospects.
- Public Riverside demo stays sample-only; /trial there explains private trials and does not create orgs.
- Day 31: plan=locked (reads on, writes blocked). Day 61: R2 export commons/offboard/{orgId}/ then delete; notify treasurer first.
- Cron `/api/cron/commons-trial-lifecycle`.
- Custom DNS still via Staff → Site settings when they are ready; site stays login-gated until product adds a public-site flag.
- Env: COMMONS_PLATFORM, COMMONS_PROVISION_SECRET (≥16 chars), BETTER_AUTH_*, commons-prod DATABASE_URL.
