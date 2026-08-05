/**
 * Smoke tests for Comms calendar helpers + month grid math.
 * Run: node --experimental-strip-types frontend/scripts/test-comms-calendar.mjs
 * (or via tsx). Plain JS port for zero deps.
 */
import assert from 'node:assert/strict'

// Inline mirrors of lib helpers so this runs without ts loader.
const COMMS_CHANNELS = ['email', 'whatsapp', 'social', 'portal', 'flyer', 'in_person', 'other']
const CONTENT_CHANNELS = ['social', 'flyer', 'portal']
const COMMS_PLANNER_KINDS = ['comms', 'content']
const COMMS_AUDIENCES = ['parents', 'school', 'board']

function normalizeCommsChannel(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  return COMMS_CHANNELS.includes(v) ? v : 'other'
}
function defaultKindForChannel(channel) {
  return CONTENT_CHANNELS.includes(channel) ? 'content' : 'comms'
}
function normalizeCommsPlannerKind(raw, channel) {
  const v = String(raw ?? '').trim().toLowerCase()
  if (COMMS_PLANNER_KINDS.includes(v)) return v
  return channel ? defaultKindForChannel(channel) : 'comms'
}
function parseCommsAudiences(raw) {
  const parts = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(/[,|;]/).map((s) => s.trim())
  const out = []
  const seen = new Set()
  for (const part of parts) {
    const a = String(part).trim().toLowerCase()
    if (COMMS_AUDIENCES.includes(a) && !seen.has(a)) {
      seen.add(a)
      out.push(a)
    }
  }
  return out
}
function startOfWeekMonday(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}
function buildMonthCells(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const day = first.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() + mondayOffset)
  const cells = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }
  return cells
}
function eventDayKey(iso) {
  const raw = String(iso ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return null
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// --- tests ---
assert.equal(normalizeCommsPlannerKind('content'), 'content')
assert.equal(normalizeCommsPlannerKind('', 'social'), 'content')
assert.equal(normalizeCommsPlannerKind('', 'email'), 'comms')
assert.equal(normalizeCommsPlannerKind('nope', 'flyer'), 'content')
assert.equal(defaultKindForChannel('whatsapp'), 'comms')

assert.deepEqual(parseCommsAudiences('parents,board'), ['parents', 'board'])
assert.deepEqual(parseCommsAudiences(['school', 'school', 'parents']), ['school', 'parents'])
assert.deepEqual(parseCommsAudiences(''), [])

const mon = startOfWeekMonday(new Date('2026-08-05T15:00:00')) // Wed
assert.equal(mon.getDay(), 1)
assert.equal(mon.getDate(), 3)

const cells = buildMonthCells(new Date(2026, 7, 1)) // Aug 2026
assert.equal(cells.length, 42)
assert.equal(cells[0].getDay(), 1) // Monday start
// Aug 1 2026 is Saturday → grid starts Mon Jul 27
assert.equal(cells[0].getMonth(), 6)
assert.equal(cells[0].getDate(), 27)

const localNoon = new Date(2026, 7, 13, 12, 0, 0) // Aug 13 local noon
assert.equal(eventDayKey(localNoon.toISOString()), '2026-08-13')
assert.equal(eventDayKey('2026-08-13'), '2026-08-13')
assert.equal(eventDayKey(''), null)

assert.equal(normalizeCommsChannel('Social'), 'social')
assert.equal(normalizeCommsChannel('nope'), 'other')

console.log('OK — comms calendar helper smoke passed')
