# Pavilion deploy is opt-in after SHMS ships

Same monorepo for now. Separate products:
- `frontend` → Stone Hill / www.shmspto.org
- `commons-pto-demo` → Riverside demo (not git-connected)
- `commons-pto` → private trials (not git-connected)
- `commons-site` → Pavilion marketing / onpavilion.com

**Build Pavilion as if SHMS never existed.** No Stone Hill PII on demo/trials.

**Ship rule:** Deploy the product the task is for. After an SHMS application ship, **ask** whether to also deploy Pavilion from that SHA when it helps the platform. Do **not** auto-deploy Commons on every Stone Hill change.

`node scripts/commons-parity.mjs` at session start is informational. Catch up Pavilion only when Rob says yes or the task is Pavilion-facing.

Never copy env between Stone Hill and Pavilion projects. Plaid stays Trial until paying Pavilion clients (`mem:commons-plaid`).

After Pavilion-facing ships: `node scripts/commons-surface-check.mjs`.
