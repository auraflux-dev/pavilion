'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type StaffRow = {
  id: string
  email: string
  name: string
  boardTitle: string
  roles: string[]
  assignedProgramIds: string[]
  active: boolean
}

export function StaffRoleManager() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [boardTitle, setBoardTitle] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [assignedProgramIds, setAssignedProgramIds] = useState('')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/staff/roles')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Could not load staff roles')
    setStaff(data.staff ?? [])
    setAvailableRoles(data.availableRoles ?? [])
  }, [])

  useEffect(() => {
    load().catch((err) => setStatus(err instanceof Error ? err.message : 'Could not load staff roles'))
  }, [load])

  function edit(row: StaffRow) {
    setEmail(row.email)
    setName(row.name)
    setBoardTitle(row.boardTitle)
    setRoles(row.roles)
    setAssignedProgramIds((row.assignedProgramIds ?? []).join(', '))
    setActive(row.active)
    setStatus(`Editing ${row.email}`)
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
          assignedProgramIds,
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
      setAssignedProgramIds('')
      setActive(true)
      setStatus('Staff access saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save staff role')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Admin · Staff access</h2>
        <p className="text-xs text-[#5A6070]">
          Assign staff tools only to official @shmspto.org accounts. Personal family accounts remain
          separate. Anyone who signs in once with their @shmspto.org email appears below automatically
          with no roles — click their row and check the roles to activate them.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@shmspto.org"
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={boardTitle}
          onChange={(event) => setBoardTitle(event.target.value)}
          placeholder="Board title"
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {availableRoles.map((role) => (
          <label key={role} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E4DC] px-2.5 py-1.5 text-xs">
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={(event) =>
                setRoles((current) =>
                  event.target.checked ? [...current, role] : current.filter((item) => item !== role),
                )
              }
            />
            {role}
          </label>
        ))}
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E4DC] px-2.5 py-1.5 text-xs">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <input
        value={assignedProgramIds}
        onChange={(event) => setAssignedProgramIds(event.target.value)}
        placeholder="Assigned program IDs (comma-separated) — required for instructor/coordinator"
        className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
      />
      <p className="text-[11px] text-[#5A6070]">
        Copy program IDs from Staff → Programs (open a program in Wix CMS, or ask admin). Instructors and
        coordinators only see assigned programs.
      </p>

      <Button
        disabled={busy || !email || roles.length === 0}
        onClick={save}
        className="text-white"
        style={{ backgroundColor: '#085508' }}
      >
        {busy ? 'Saving…' : 'Save staff access'}
      </Button>
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      <div className="space-y-2">
        {staff.map((row) => (
          <button
            key={row.id || row.email}
            type="button"
            onClick={() => edit(row)}
            className="w-full text-left border-t border-[#F0EBE3] pt-2 flex items-start justify-between gap-3"
          >
            <span>
              <span className="block text-sm font-semibold">{row.name || row.email}</span>
              <span className="block text-xs text-[#5A6070]">
                {row.email} · {row.roles.join(', ')}
                {(row.assignedProgramIds ?? []).length
                  ? ` · ${row.assignedProgramIds.length} program(s)`
                  : ''}
              </span>
            </span>
            <span className={`text-xs font-bold ${row.active ? 'text-[#085508]' : 'text-[#8A4B00]'}`}>
              {row.active ? 'Active' : 'Inactive'}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
