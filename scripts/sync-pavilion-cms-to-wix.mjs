#!/usr/bin/env node
/**
 * Sync Pavilion CMS export → Wix CMS (SHMS publish path).
 *
 * Pavilion CMS is authoritative. Run this from ~/shmspto with Wix creds
 * (doppler_prd) after exporting JSON from Pavilion / Staff.
 *
 *   bash scripts/doppler_prd.sh node scripts/sync-pavilion-cms-to-wix.mjs --from-file ./tmp/cms-export.json
 *
 * Export shape:
 * {
 *   siteSettings: { key: value },
 *   pageContent: [ { page, eyebrow, title, body, ... } ],
 *   navLinks: [ { id, label, href, sortOrder, showInNav, showInFooter, active } ]
 * }
 *
 * Stub: validates input and prints planned Wix writes. Wire live upserts when
 * Rob runs the first SHMS import (avoid accidental overwrite without --apply).
 */
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const fileIdx = args.indexOf('--from-file')
const apply = args.includes('--apply')
const file = fileIdx >= 0 ? args[fileIdx + 1] : ''

if (!file) {
  console.error('Usage: node scripts/sync-pavilion-cms-to-wix.mjs --from-file ./tmp/cms-export.json [--apply]')
  process.exit(1)
}

const abs = path.resolve(file)
const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
const settings = Object.keys(raw.siteSettings || {}).length
const pages = Array.isArray(raw.pageContent) ? raw.pageContent.length : 0
const nav = Array.isArray(raw.navLinks) ? raw.navLinks.length : 0

console.log(
  JSON.stringify(
    {
      file: abs,
      apply,
      planned: { siteSettings: settings, pageContent: pages, navLinks: nav },
      note: apply
        ? 'Live Wix upserts not yet wired in this stub — implement upserts with WIX_API_KEY / WIX_SITE_ID next.'
        : 'Dry-run only. Pass --apply after live upserts are implemented.',
    },
    null,
    2,
  ),
)
