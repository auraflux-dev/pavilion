'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StaffTask, TaskSource, TaskStatus } from '@/lib/staff/tasks'

type Props = {
  myRoles: string[]
  isAdmin: boolean
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  triage: 'Triage',
  open: 'Open',
  blocked: 'Blocked',
  done: 'Done',
}

export function StaffTasksPanel({ myRoles, isAdmin }: Props) {
  const [tasks, setTasks] = useState<StaffTask[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [filterRole, setFilterRole] = useState('')
  const [includeDone, setIncludeDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerRole, setOwnerRole] = useState(myRoles[0] || 'admin')
  const [dueLocal, setDueLocal] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [source, setSource] = useState<TaskSource>('board')
  const [blockedByNote, setBlockedByNote] = useState('')
  const [blockedByTaskId, setBlockedByTaskId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRole) params.set('role', filterRole)
      if (includeDone) params.set('includeDone', 'true')
      const r = await fetch(`/api/staff/tasks?${params}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load tasks')
      setTasks(d.tasks ?? [])
      setRoles(d.roles ?? [])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load tasks')
    } finally {
      setLoading(false)
    }
  }, [filterRole, includeDone])

  useEffect(() => {
    void load()
  }, [load])

  const openChoices = useMemo(
    () => tasks.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, label: `${t.title} (${t.ownerRole})` })),
    [tasks],
  )

  async function createTask() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          ownerRole,
          status: source === 'faculty' || source === 'admin' ? 'triage' : 'open',
          dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
          requestedBy,
          source,
          blockedByNote,
          blockedByTaskId,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not create task')
      setTitle('')
      setDescription('')
      setDueLocal('')
      setRequestedBy('')
      setBlockedByNote('')
      setBlockedByTaskId('')
      setSource('board')
      setStatus('Task added.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create task')
    } finally {
      setBusy(false)
    }
  }

  async function patchTask(id: string, body: Record<string, unknown>) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/staff/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not update task')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update task')
    } finally {
      setBusy(false)
    }
  }

  function dueLabel(dueAt: string | null) {
    if (!dueAt) return 'No due date'
    const t = Date.parse(dueAt)
    if (Number.isNaN(t)) return 'No due date'
    const days = Math.ceil((t - Date.now()) / 86400000)
    const date = new Date(t).toLocaleDateString()
    if (days < 0) return `Overdue · ${date}`
    if (days === 0) return `Due today · ${date}`
    if (days === 1) return `Due tomorrow · ${date}`
    return `Due in ${days}d · ${date}`
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Staff · Work by role</h2>
        <p className="text-xs text-[#5A6070]">
          Simple ownership board — not a project-management suite. Assign to a role, set a due date,
          note what it&apos;s waiting on. Faculty/admin asks go to Triage for the president.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">My roles{isAdmin ? ' / all (admin)' : ''}</option>
          {(isAdmin ? roles : myRoles).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={includeDone}
            onChange={(e) => setIncludeDone(e.target.checked)}
          />
          Show done
        </label>
      </div>

      <div className="rounded-lg border border-[#E8E4DC] p-3 space-y-2 bg-[#FAFAF8]">
        <p className="text-xs font-bold text-[#5A6070]">Add work</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to happen?"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Details (optional)"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            value={ownerRole}
            onChange={(e) => setOwnerRole(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            {(isAdmin ? roles : Array.from(new Set([...myRoles, 'admin']))).map((role) => (
              <option key={role} value={role}>
                Owner: {role}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as TaskSource)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="board">From board</option>
            <option value="faculty">From faculty</option>
            <option value="admin">From SHMS admin</option>
          </select>
          <input
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Requested by (name)"
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <input
          value={blockedByNote}
          onChange={(e) => setBlockedByNote(e.target.value)}
          placeholder="Waiting on… (optional note)"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={blockedByTaskId}
          onChange={(e) => setBlockedByTaskId(e.target.value)}
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Blocked by another task? (optional)</option>
          {openChoices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Button
          disabled={busy || !title.trim()}
          onClick={() => void createTask()}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? '…' : 'Add task'}
        </Button>
      </div>

      {loading ? <p className="text-xs text-[#5A6070]">Loading…</p> : null}
      {!loading && tasks.length === 0 ? (
        <p className="text-xs text-[#5A6070]">No open tasks for this filter.</p>
      ) : null}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="border border-[#E8E4DC] rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="text-xs text-[#5A6070]">
                  {task.ownerRole} · {STATUS_LABEL[task.status]} · {task.source}
                  {task.requestedBy ? ` · from ${task.requestedBy}` : ''}
                </p>
                <p
                  className={`text-xs ${
                    task.dueAt && Date.parse(task.dueAt) < Date.now() && task.status !== 'done'
                      ? 'text-amber-800 font-semibold'
                      : 'text-[#5A6070]'
                  }`}
                >
                  {dueLabel(task.dueAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {task.status === 'triage' && isAdmin ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void patchTask(task.id, { status: 'open' })}
                  >
                    Accept
                  </Button>
                ) : null}
                {task.status !== 'done' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void patchTask(task.id, {
                        status: 'done',
                        blockedByNote: '',
                        blockedByTaskId: '',
                      })
                    }
                  >
                    Done
                  </Button>
                ) : null}
                {task.status === 'blocked' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void patchTask(task.id, {
                        status: 'open',
                        blockedByNote: '',
                        blockedByTaskId: '',
                      })
                    }
                  >
                    Unblock
                  </Button>
                ) : null}
                {task.status !== 'done' && isAdmin ? (
                  <select
                    className="border border-[#E8E4DC] rounded-lg px-2 py-1 text-xs"
                    value={task.ownerRole}
                    disabled={busy}
                    onChange={(e) => void patchTask(task.id, { ownerRole: e.target.value, status: 'open' })}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        → {role}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
            {task.description ? <p className="text-xs text-[#5A6070] whitespace-pre-wrap">{task.description}</p> : null}
            {task.blockedByNote || task.blockedByTaskId ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                Waiting on: {task.blockedByNote || 'linked task'}
                {task.blockedByTaskId
                  ? ` (${tasks.find((t) => t.id === task.blockedByTaskId)?.title || task.blockedByTaskId})`
                  : ''}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
