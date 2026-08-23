#!/usr/bin/env node
/**
 * Stone Hill staging/production do NOT deploy from this monorepo via CLI.
 *
 * Treasurer www.shmspto.org deploy path:
 *   1. Commit in auraflux-dev/shmspto (~/shmspto)
 *   2. git push origin main
 *   3. node scripts/check-prod-deploy.mjs
 *
 * See ~/shmspto/scripts/DEPLOY.md and .cursor/rules/shms-deploy-git.mdc
 *
 * Rob-only CLI fallback (treasurer login): ~/shmspto/scripts/deploy-staging.mjs
 */
console.error(`
Stone Hill CLI deploy is disabled from wix-shmspto.

Agents: port frontend/ changes to ~/shmspto, push auraflux-dev/shmspto main,
then run node scripts/check-prod-deploy.mjs from that repo.

Do not vercel deploy Stone Hill from robert-4220s-projects (Pavilion / HSKRG only).
Treasurer auto-deploys from shmspto Git; agents cannot CLI-deploy without treasurer login.
`)
process.exit(1)
