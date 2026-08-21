'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StaffWorkspace } from '@/lib/audience'
import {
  STAFF_ADMIN_WORKSPACES,
  STAFF_BASE_WORKSPACES,
  STAFF_PERMISSION_GROUPS,
  STAFF_ROLE_LABEL,
  rolesThatInclude,
  workspaceLabel,
  workspacesFromRoles,
} from '@/lib/staff/permissions'
import type { StaffRole } from '@/lib/staff/roles'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { FALL_2026_EP_CLASSES } from '@/lib/programs/fall-2026-ep'
import {
  EP_INSTRUCTOR_MAILBOXES,
  WORKSPACE_MAILBOXES,
  findWorkspaceMailbox,
} from '@/lib/staff/workspace-mailboxes'

type StaffRow = {
  id: string
  email: string
  name: string
  boardTitle: string
  roles: string[]
  extraWorkspaces: StaffWorkspace[]
  assignedProgramIds: string[]
  personalEmail: string
  active: boolean
}

type ProgramOption = { id: string; name: string }

function roleLabel(role: string) {
  return STAFF_ROLE_LABEL[role as StaffRole] ?? role
}

function includedHint(workspace: StaffWorkspace) {
  const owners = rolesThatInclude(workspace)
  if (!owners.length) return ''
  return `Included with ${owners.map(roleLabel).join(', ')}`
}

export function StaffRoleManager() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [scope, setScope] = useState<'all' | 'instructors'>('all')
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [boardTitle, setBoardTitle] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [extras, setExtras] = useState<StaffWorkspace[]>([])
  const [assignedProgramIds, setAssignedProgramIds] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [grantBoardSeatBenefits, setGrantBoardSeatBenefits] = useState(false)
  const [active, setActive] = useState(true)
  const [permissionQuery, setPermissionQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [status, setStatus] = useState('')

  const implied = useMemo(() => workspacesFromRoles(roles), [roles])
  const q = permissionQuery.trim().toLowerCase()

  const load = useCallback(async () => {
    const response = await fetch('/api/staff/roles')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Could not load staff roles')
    setStaff(data.staff ?? [])
    setAvailableRoles(data.availableRoles ?? [])
    setScope(data.scope === 'instructors' ? 'instructors' : 'all')
    const programsRes = await fetch('/api/staff/programs')
    const programsData = await programsRes.json().catch(() => ({}))
    if (programsRes.ok) {
      const mapped = (programsData.programs ?? [])
        .map((p: { id?: string; name?: string; tags?: string; featured?: boolean }) => ({
          id: String(p.id ?? ''),
          name: String(p.name ?? ''),
          tags: String(p.tags ?? ''),
          featured: p.featured === true,
        }))
        .filter((p: { id: string }) => p.id)
      const fall = mapped.filter(
        (p: { name: string; tags: string; featured: boolean }) =>
          /fall 2026/i.test(p.name) || p.featured || /fall-2026/i.test(p.tags),
      )
      setPrograms((fall.length ? fall : mapped).map(({ id, name }: ProgramOption) => ({ id, name })))
    }
  }, [])

  useEffect(() => {
    load().catch((err) => setStatus(err instanceof Error ? err.message : 'Could not load staff roles'))
  }, [load])

  function edit(row: StaffRow) {
    setEmail(row.email)
    setName(row.name)
    setBoardTitle(row.boardTitle)
    setRoles(row.roles)
    setExtras(row.extraWorkspaces ?? [])
    setAssignedProgramIds((row.assignedProgramIds ?? []).join(', '))
    setPersonalEmail(row.personalEmail ?? '')
    setGrantBoardSeatBenefits(false)
    setActive(row.active)
    setPermissionQuery('')
    setStatus(`Editing ${row.email}`)
  }

  function toggleExtra(workspace: StaffWorkspace, checked: boolean) {
    if (implied.has(workspace)) return
    if (STAFF_ADMIN_WORKSPACES.includes(workspace) || STAFF_BASE_WORKSPACES.includes(workspace)) return
    setExtras((current) =>
      checked ? Array.from(new Set([...current, workspace])) : current.filter((item) => item !== workspace),
    )
  }

  async function save() {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/staff/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          boardTitle,
          roles,
          extraWorkspaces: extras,
          assignedProgramIds,
          personalEmail,
          grantBoardSeatBenefits: scope === 'all' ? grantBoardSeatBenefits : false,
          active,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save staff role')
      await load()
      setEmail('')
      setName('')
      setBoardTitle('')
      setRoles([])
      setExtras([])
      setAssignedProgramIds('')
      setPersonalEmail('')
      setGrantBoardSeatBenefits(false)
      setActive(true)
      setPermissionQuery('')
      const perks = data.boardSeatBenefits as
        | { fallCode?: string; springCode?: string; enrichmentCode?: string | null }
        | null
        | undefined
      setStatus(
        perks?.fallCode
          ? `Staff access saved. Board Reef + 75% codes: ${perks.fallCode} / ${perks.springCode}${perks.enrichmentCode ? ` · ${perks.enrichmentCode}` : ''}.`
          : 'Staff access saved.',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save staff role')
    } finally {
      setBusy(false)
    }
  }

  async function syncFromGoogle() {
    setSyncBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/staff/roles/sync-google', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Google sync failed')
      await load()
      const created = Number(data.created ?? 0)
      const scanned = Number(data.scanned ?? 0)
      setStatus(
        created > 0
          ? `Synced from Google. Added ${created} new seat${created === 1 ? '' : 's'} (${scanned} Workspace users scanned). Assign roles below.`
          : `Synced from Google. No new seats (${scanned} Workspace users already listed or suspended).`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Google sync failed')
    } finally {
      setSyncBusy(false)
    }
  }

  const moneyExtra = extras.includes('payments') || extras.includes('budget')
  const canSave = Boolean(email && (roles.length > 0 || extras.length > 0))

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">
          {scope === 'instructors' ? 'Instructors & class coordinators' : 'Admin · Staff access'}
        </h2>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {scope === 'instructors'
            ? 'Pick an EP mailbox from the Google list (math, robotics, business plan).\nSet Instructor and tick their class.\nEssay has no EP mailbox yet. Add one in Workspace for Lumi first.'
            : 'Pick a role for the usual toolkit, then tick any extra permissions below.\nStaff tools stay on official @' +
              (isPublicDemoInstance() ? DEMO_BRAND.host : 'shmspto.org') +
              ' accounts.\nLink a personal email for the parent portal.\nSync from Google after you create users in Admin so seats appear before first login.'}
        </p>
        {scope === 'all' ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              disabled={syncBusy || busy}
              onClick={() => void syncFromGoogle()}
            >
              {syncBusy ? 'Syncing…' : 'Sync from Google Workspace'}
            </Button>
            <p className="text-[11px] text-[#5A6070] mt-1.5 whitespace-pre-line">
              Pulls active @shmspto.org users into this list.
              New seats start with no roles. Assign role and programs here.
              Requires Connect Google as a Workspace admin (Staff → Inbox).
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#5A6070] mb-1">
            Workspace mailbox
          </label>
          <select
            value={WORKSPACE_MAILBOXES.some((row) => row.email === email.trim().toLowerCase()) ? email.trim().toLowerCase() : ''}
            onChange={(event) => {
              const next = event.target.value
              if (!next) return
              setEmail(next)
              const box = findWorkspaceMailbox(next)
              if (box) {
                setName(box.displayName)
                setBoardTitle(
                  next === 'initiatives-coordinator@shmspto.org'
                    ? 'Initiatives Coordinator'
                    : box.displayName,
                )
              }
              if (next === 'initiatives-coordinator@shmspto.org' && roles.length === 0) {
                setRoles(['programs'])
              }
              if (scope === 'instructors' && roles.length === 0) setRoles(['instructor'])
              const klass = FALL_2026_EP_CLASSES.find((c) => c.suggestedMailbox === next)
              if (klass) {
                const match = programs.find((p) =>
                  klass.cmsNameIncludes.some((part) => p.name.toLowerCase().includes(part)),
                )
                if (match) setAssignedProgramIds(match.id)
              }
            }}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Pick from Google Workspace…</option>
            <optgroup label="EP instructor mailboxes">
              {EP_INSTRUCTOR_MAILBOXES.map((row) => (
                <option key={row.email} value={row.email}>
                  {row.displayName} ({row.email})
                  {row.note ? `. ${row.note}` : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="All 30 workspace mailboxes">
              {WORKSPACE_MAILBOXES.map((row) => (
                <option key={`all-${row.email}`} value={row.email}>
                  {row.displayName} ({row.email})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={isPublicDemoInstance() ? `person@${DEMO_BRAND.host}` : 'person@shmspto.org'}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={boardTitle}
          onChange={(event) => setBoardTitle(event.target.value)}
          placeholder="Board title"
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#5A6070] mb-1.5">Roles</p>
        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => {
            const adminLocked = role === 'admin' && email.trim().toLowerCase() !== 'president@shmspto.org'
            return (
              <label
                key={role}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  disabled={adminLocked}
                  title={adminLocked ? 'Admin is only for president@shmspto.org' : undefined}
                  onChange={(event) =>
                    setRoles((current) =>
                      event.target.checked ? [...current, role] : current.filter((item) => item !== role),
                    )
                  }
                />
                {roleLabel(role)}
                {adminLocked ? ' (president@ only)' : ''}
              </label>
            )
          })}
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
        </div>
      </div>

      {scope === 'all' ? (
      <div className="rounded-lg border border-[var(--border)] bg-[#FBF9F6] p-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#5A6070]">Permissions</p>
            <p className="text-[11px] text-[#5A6070]">
              Everything is listed. Role boxes are already covered; tick extras to add.
            </p>
          </div>
          <input
            value={permissionQuery}
            onChange={(event) => setPermissionQuery(event.target.value)}
            placeholder="Find a permission…"
            className="sm:w-56 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-white"
          />
        </div>

        {STAFF_PERMISSION_GROUPS.map((group) => {
          const items = group.items.filter((id) => {
            if (!q) return true
            return (
              workspaceLabel(id).toLowerCase().includes(q) ||
              id.toLowerCase().includes(q) ||
              includedHint(id).toLowerCase().includes(q)
            )
          })
          if (!items.length) return null
          return (
            <div key={group.id}>
              <p className="text-[11px] font-semibold text-[#1B365D] mb-1">{group.label}</p>
              <div className="grid sm:grid-cols-2 gap-1">
                {items.map((id) => {
                  const adminOnly = STAFF_ADMIN_WORKSPACES.includes(id)
                  const alwaysOn = STAFF_BASE_WORKSPACES.includes(id)
                  const fromRole = implied.has(id)
                  const extraOn = extras.includes(id)
                  const checked =
                    alwaysOn || fromRole || extraOn || (adminOnly && roles.includes('admin'))
                  const locked = adminOnly || alwaysOn || fromRole
                  const hint = adminOnly
                    ? 'Admin only (president@)'
                    : alwaysOn
                      ? 'Everyone with staff access'
                      : fromRole
                        ? includedHint(id)
                        : extraOn
                          ? 'Extra permission'
                          : includedHint(id) || 'Tick to add'
                  return (
                    <label
                      key={id}
                      className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                        locked ? 'opacity-80' : 'hover:bg-white cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        disabled={locked}
                        onChange={(event) => toggleExtra(id, event.target.checked)}
                      />
                      <span>
                        <span className="font-medium">{workspaceLabel(id)}</span>
                        <span className="block text-[11px] text-[#5A6070]">{hint}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}

        {moneyExtra ? (
          <p className="text-[11px] text-[#8A4B00]">
            Payments and Budget extras also unlock treasurer tools, including bank connections.
          </p>
        ) : null}
      </div>
      ) : null}

      <input
        type="email"
        value={personalEmail}
        onChange={(event) => setPersonalEmail(event.target.value)}
        placeholder="Personal / parent portal email (e.g. you@gmail.com)"
        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
      />
      <p className="text-[11px] text-[#5A6070]">
        Optional. Their family login for Member Portal. Must not be @
        {isPublicDemoInstance() ? DEMO_BRAND.host : 'shmspto.org'}.
      </p>
      {scope === 'all' ? (
        <label className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[#FBF9F6] px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={grantBoardSeatBenefits}
            disabled={!personalEmail.trim()}
            onChange={(event) => setGrantBoardSeatBenefits(event.target.checked)}
          />
          <span>
            <span className="font-medium">Grant board seat perks</span>
            <span className="block text-[11px] text-[#5A6070] whitespace-pre-line">
              Complimentary Reef on the personal email above.
              Plus 75% off 1 enrichment program for Fall and 1 for Spring.
              Magnet fulfillment stays on Membership → Fulfillments.
            </span>
          </span>
        </label>
      ) : null}

      {programs.length ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#5A6070] mb-1.5">Class assignment</p>
          <div className="flex flex-wrap gap-2">
            {programs.map((program) => {
              const selected = assignedProgramIds
                .split(/[,|;]/)
                .map((id) => id.trim())
                .filter(Boolean)
                .includes(program.id)
              return (
                <label
                  key={program.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const current = assignedProgramIds
                        .split(/[,|;]/)
                        .map((id) => id.trim())
                        .filter(Boolean)
                      setAssignedProgramIds(
                        (event.target.checked
                          ? [...current, program.id]
                          : current.filter((id) => id !== program.id)
                        ).join(', '),
                      )
                    }}
                  />
                  {program.name}
                </label>
              )
            })}
          </div>
        </div>
      ) : (
        <input
          value={assignedProgramIds}
          onChange={(event) => setAssignedProgramIds(event.target.value)}
          placeholder="Assigned program IDs (comma-separated). Required for instructor/coordinator"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
      )}

      <Button
        disabled={busy || !canSave}
        onClick={save}
        className="text-white"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {busy ? 'Saving…' : 'Save staff access'}
      </Button>
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      <div className="space-y-2">
        {staff.map((row) => {
          const extraLabel = (row.extraWorkspaces ?? []).map(workspaceLabel).join(', ')
          return (
            <button
              key={row.id || row.email}
              type="button"
              onClick={() => edit(row)}
              className="w-full text-left border-t border-[#F0EBE3] pt-2 flex items-start justify-between gap-3"
            >
              <span>
                <span className="block text-sm font-semibold">{row.name || row.email}</span>
                <span className="block text-xs text-[#5A6070]">
                  {row.email}
                  {row.roles.length ? ` · ${row.roles.map(roleLabel).join(', ')}` : ' · no role'}
                  {extraLabel ? ` · extras: ${extraLabel}` : ''}
                  {row.personalEmail ? ` · parent: ${row.personalEmail}` : ''}
                  {(row.assignedProgramIds ?? []).length
                    ? ` · ${row.assignedProgramIds.length} program(s)`
                    : ''}
                </span>
              </span>
              <span className={`text-xs font-bold ${row.active ? 'text-[var(--brand-green)]' : 'text-[#8A4B00]'}`}>
                {row.active ? 'Active' : 'Inactive'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
