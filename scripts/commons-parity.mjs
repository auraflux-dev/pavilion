#!/usr/bin/env node
/**
 * Compare origin/main, Stone Hill production, and Commons production git SHAs.
 * Commons is not git-connected — if it lags, deploy commons-pto-demo from a clean worktree.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEAM = 'team_RXhJ9wjn7h5OcGCE86ILmftT'
const SHMS_PROJECT = 'prj_zYYjrqLzcZ4imfYWLo8Iv8coavqG'
const COMMONS_PROJECT = 'prj_kEgcls4K0JjeAL3kBHWwobIhKEco'

function gitSha(ref) {
  try {
    return execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function vercelToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim()
  const candidates = [
    join(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
    join(homedir(), '.local/share/com.vercel.cli/auth.json'),
    join(homedir(), '.config/vercel/auth.json'),
  ]
  for (const path of candidates) {
    try {
      const json = JSON.parse(readFileSync(path, 'utf8'))
      const token = json.token || json.accessToken || json.authToken
      if (typeof token === 'string' && token) return token
    } catch {
      // next path
    }
  }
  return ''
}

async function latestProdSha(projectId, token) {
  const url = new URL('https://api.vercel.com/v6/deployments')
  url.searchParams.set('projectId', projectId)
  url.searchParams.set('teamId', TEAM)
  url.searchParams.set('target', 'production')
  url.searchParams.set('limit', '20')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return { sha: '', error: `${res.status}` }
  const body = await res.json()
  const rows = body.deployments || []
  const ready = rows.find((d) => d.state === 'READY' && d.target === 'production')
  const meta = ready?.meta || {}
  const sha = meta.gitCommitSha || meta.githubCommitSha || ''
  const message = meta.gitCommitMessage || meta.githubCommitMessage || ''
  return { sha, message, id: ready?.id || '', error: sha ? '' : 'no-sha' }
}

function short(sha) {
  return sha ? sha.slice(0, 7) : '(unknown)'
}

const origin = gitSha('origin/main') || gitSha('HEAD')
const token = vercelToken()
const shms = token ? await latestProdSha(SHMS_PROJECT, token) : { sha: '', error: 'no-token' }
const commons = token ? await latestProdSha(COMMONS_PROJECT, token) : { sha: '', error: 'no-token' }

const behind =
  Boolean(origin && commons.sha && commons.sha !== origin) ||
  Boolean(shms.sha && commons.sha && commons.sha !== shms.sha)

const report = {
  originMain: origin,
  stoneHillProd: shms.sha,
  stoneHillMessage: shms.message,
  commonsProd: commons.sha,
  commonsMessage: commons.message,
  commonsError: commons.error,
  behind,
  action: behind
    ? `Deploy commons-pto-demo from a clean worktree of ${short(shms.sha || origin)} (already on GitHub / Stone Hill). Do not deploy from a dirty tree.`
    : 'Commons matches the shipped SHA.',
}

console.log(JSON.stringify(report, null, 2))

const surface = spawnSync(
  process.execPath,
  [join(dirname(fileURLToPath(import.meta.url)), 'commons-surface-check.mjs')],
  { encoding: 'utf8' },
)
if (surface.status !== 0) {
  console.error(surface.stdout || surface.stderr || 'commons-surface-check failed')
  process.exit(1)
}

if (behind) process.exit(2)
process.exit(0)
