# Pavilion deploy is opt-in; SHMS is a separate repo

- **SHMS:** `auraflux-dev/shmspto` → Vercel `frontend` → www.shmspto.org (school-only; forbids COMMONS_PLATFORM).
- **Pavilion:** this repo `wix-shmspto` → commons-site / commons-pto-demo / commons-pto.

Do **not** auto-deploy Pavilion on every SHMS change. Ask when an SHMS change should also land on Pavilion.

`node scripts/commons-parity.mjs` is informational for Pavilion SHAs only (not SHMS handoff).

Never copy env between Stone Hill and Pavilion projects.
