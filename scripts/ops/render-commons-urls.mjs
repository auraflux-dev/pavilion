#!/usr/bin/env node
/** Write Render external Postgres URLs to /tmp for neon-migrate.mjs */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs'

const IDS = {
  prod: 'dpg-da2t0167bikc73bmb9og-a',
  crm: 'dpg-da2fomm417fc73eq5jng-a',
}

function renderToken() {
  const m = JSON.parse(readFileSync(`${process.env.HOME}/.cursor/mcp.json`, 'utf8'))
  return m.mcpServers.render.headers.Authorization.replace(/^Bearer\s+/i, '')
}

async function externalUrl(id) {
  const token = renderToken()
  const info = await fetch(`https://api.render.com/v1/postgres/${id}/connection-info`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json())
  let u = info.externalConnectionString
  if (!u) throw new Error(`No external URL for ${id}`)
  if (!u.includes('sslmode=')) u += (u.includes('?') ? '&' : '?') + 'sslmode=require'
  return u
}

;(async () => {
  const prod = await externalUrl(IDS.prod)
  const crm = await externalUrl(IDS.crm)
  writeFileSync('/tmp/render-commons-prod.url', prod, { mode: 0o600 })
  writeFileSync('/tmp/render-commons-crm.url', crm, { mode: 0o600 })
  chmodSync('/tmp/render-commons-prod.url', 0o600)
  chmodSync('/tmp/render-commons-crm.url', 0o600)
  console.log('wrote /tmp/render-commons-prod.url', prod.length, 'chars')
  console.log('wrote /tmp/render-commons-crm.url', crm.length, 'chars')
})().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
