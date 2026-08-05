'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  StaffMonthCalendar,
  eventDayKey,
  type MonthCalendarEvent,
  type MonthCalendarTone,
} from '@/components/staff/staff-month-calendar'
import { currentSchoolYear, type StaffDirectoryPerson, type StaffProject } from '@/lib/staff/projects'
import type { StaffTask, TaskStatus } from '@/lib/staff/tasks'

type Props = {
  myRoles: string[]
  isAdmin: boolean
  myEmail?: string
}

type ViewMode = 'year' | 'mine' | 'project' | 'calendar'

const STATUS_LABEL: Record<TaskStatus, string> = {
  triage: 'Triage',
  open: 'Open',
  blocked: 'Blocked',
  done: 'Done',
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

function personLabel(p: StaffDirectoryPerson) {
  return p.name ? `${p.name} (${p.boardTitle || p.roles.join(', ')})` : p.email
}

export function StaffTasksPanel({ myRoles, isAdmin, myEmail: myEmailProp }: Props) {
  const [view, setView] = useState<ViewMode>('year')
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null)
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear())
  const [projects, setProjects] = useState<StaffProject[]>([])
  const [directory, setDirectory] = useState<StaffDirectoryPerson[]>([])
  const [tasks, setTasks] = useState<StaffTask[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [includeDone, setIncludeDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [myEmail, setMyEmail] = useState(myEmailProp || '')

  // New project form
  const [projTitle, setProjTitle] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [projLeadRole, setProjLeadRole] = useState(myRoles[0] || 'admin')
  const [projMembers, setProjMembers] = useState<string[]>([])

  // New task form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskProjectId, setTaskProjectId] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskDueLocal, setTaskDueLocal] = useState('')
  const [taskOwnerRole, setTaskOwnerRole] = useState(myRoles[0] || 'admin')

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  const loadProjects = useCallback(async () => {
    const params = new URLSearchParams({ schoolYear })
    if (includeDone) params.set('includeDone', 'true')
    const r = await fetch(`/api/staff/projects?${params}`)
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load projects')
    setProjects(d.projects ?? [])
    setDirectory(d.directory ?? [])
    if (d.myEmail) setMyEmail(d.myEmail)
    if (d.schoolYear) setSchoolYear(d.schoolYear)
  }, [schoolYear, includeDone])

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams()
    if (view === 'mine') params.set('view', 'mine')
    else if (view === 'project' && selectedProjectId) {
      params.set('view', 'project')
      params.set('projectId', selectedProjectId)
    } else {
      // year + calendar both load the year board task set
      params.set('view', 'year')
    }
    if (includeDone) params.set('includeDone', 'true')
    const r = await fetch(`/api/staff/tasks?${params}`)
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load tasks')
    setTasks(d.tasks ?? [])
    if (d.myEmail) setMyEmail(d.myEmail)
  }, [view, selectedProjectId, includeDone])

  const load = useCallback(async () => {
    setLoading(true)
    setStatus('')
    try {
      await Promise.all([loadProjects(), loadTasks()])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load board')
    } finally {
      setLoading(false)
    }
  }, [loadProjects, loadTasks])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selectedProjectId && !taskProjectId) setTaskProjectId(selectedProjectId)
  }, [selectedProjectId, taskProjectId])

  const tasksByProject = useMemo(() => {
    const map = new Map<string, StaffTask[]>()
    for (const t of tasks) {
      const key = t.projectId || '__none__'
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return map
  }, [tasks])

  const projectTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of projects) map.set(p.id, p.title)
    return map
  }, [projects])

  const calendarEvents: MonthCalendarEvent[] = useMemo(() => {
    return tasks
      .filter((t) => t.dueAt)
      .map((t) => {
        const overdue =
          Boolean(t.dueAt && Date.parse(t.dueAt) < Date.now() && t.status !== 'done')
        let tone: MonthCalendarTone = 'slate'
        if (t.status === 'done') tone = 'green'
        else if (t.status === 'blocked' || overdue) tone = 'amber'
        else if (t.status === 'triage') tone = 'rose'
        else tone = 'blue'
        return {
          id: t.id,
          date: t.dueAt as string,
          title: t.title,
          subtitle: `${projectTitleById.get(t.projectId) || 'Task'} · ${STATUS_LABEL[t.status]}`,
          tone,
        }
      })
  }, [tasks, projectTitleById])

  const calDayTasks = useMemo(() => {
    if (!calSelectedDate) return []
    return tasks.filter((t) => t.dueAt && eventDayKey(t.dueAt) === calSelectedDate)
  }, [tasks, calSelectedDate])

  const undatedTasks = useMemo(() => tasks.filter((t) => !t.dueAt && t.status !== 'done'), [tasks])

  const assigneeChoices = useMemo(() => {
    const project = projects.find((p) => p.id === (taskProjectId || selectedProjectId))
    if (!project) return directory
    const memberSet = new Set([project.leadEmail, ...project.memberEmails])
    const members = directory.filter((d) => memberSet.has(d.email))
    // Also show full directory so you can assign after talking to someone not yet on the project
    const extras = directory.filter((d) => !memberSet.has(d.email))
    return [...members, ...extras]
  }, [directory, projects, taskProjectId, selectedProjectId])

  async function createProject() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projTitle,
          description: projDesc,
          schoolYear,
          leadRole: projLeadRole,
          memberEmails: projMembers,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not create project')
      setProjTitle('')
      setProjDesc('')
      setProjMembers([])
      setStatus('Project added to the year board.')
      setSelectedProjectId(d.project?.id ?? '')
      setView('project')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create project')
    } finally {
      setBusy(false)
    }
  }

  async function patchProject(id: string, body: Record<string, unknown>) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/staff/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not update project')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update project')
    } finally {
      setBusy(false)
    }
  }

  async function createTask() {
    setBusy(true)
    setStatus('')
    try {
      const person = directory.find((d) => d.email === taskAssignee)
      const r = await fetch('/api/staff/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          projectId: taskProjectId || selectedProjectId || undefined,
          ownerRole: taskOwnerRole,
          assigneeEmail: taskAssignee || undefined,
          assigneeName: person?.name || undefined,
          dueAt: taskDueLocal ? new Date(taskDueLocal).toISOString() : null,
          status: 'open',
          source: 'board',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not create task')
      setTaskTitle('')
      setTaskDesc('')
      setTaskDueLocal('')
      setTaskAssignee('')
      setStatus(
        taskAssignee
          ? 'Task added. It shows on the year board, this project, and their board.'
          : 'Task added to the project / year board.',
      )
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

  function toggleMember(email: string) {
    setProjMembers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    )
  }

  function renderTaskCard(task: StaffTask, projectTitle?: string) {
    const overdue = Boolean(task.dueAt && Date.parse(task.dueAt) < Date.now() && task.status !== 'done')
    return (
      <div key={task.id} className="border border-[#E8E4DC] rounded-lg p-3 space-y-2 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-[#5A6070]">
              {projectTitle ? `${projectTitle} · ` : ''}
              {STATUS_LABEL[task.status]}
              {task.assigneeName || task.assigneeEmail
                ? ` · → ${task.assigneeName || task.assigneeEmail}`
                : ' · Unassigned'}
            </p>
            <p className={`text-xs ${overdue ? 'text-amber-800 font-semibold' : 'text-[#5A6070]'}`}>
              {dueLabel(task.dueAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {task.status !== 'done' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void patchTask(task.id, { status: 'done', blockedByNote: '', blockedByTaskId: '' })}
              >
                Done
              </Button>
            ) : null}
            {task.status === 'blocked' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void patchTask(task.id, { status: 'open', blockedByNote: '', blockedByTaskId: '' })}
              >
                Unblock
              </Button>
            ) : null}
          </div>
        </div>
        {task.description ? (
          <p className="text-xs text-[#5A6070] whitespace-pre-wrap">{task.description}</p>
        ) : null}
        {task.status !== 'done' ? (
          <select
            className="w-full border border-[#E8E4DC] rounded-lg px-2 py-1.5 text-xs"
            value={task.assigneeEmail}
            disabled={busy}
            onChange={(e) => {
              const email = e.target.value
              const person = directory.find((d) => d.email === email)
              void patchTask(task.id, {
                assigneeEmail: email,
                assigneeName: person?.name || email,
              })
            }}
          >
            <option value="">Assign after you&apos;ve talked…</option>
            {directory.map((p) => (
              <option key={p.email} value={p.email}>
                {personLabel(p)}
              </option>
            ))}
          </select>
        ) : null}
        {task.blockedByNote ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            Waiting on: {task.blockedByNote}
          </p>
        ) : null}
      </div>
    )
  }

  const yearOptions = useMemo(() => {
    const cur = currentSchoolYear()
    const [a] = cur.split('-').map(Number)
    return [`${a - 1}-${a}`, cur, `${a + 1}-${a + 2}`]
  }, [])

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Staff · Year project board</h2>
        <p className="text-xs text-[#5A6070]">
          Each VP / president adds projects for the school year. Everyone sees the swimlanes.
          Assign a task to a member after you&apos;ve talked. It shows on the year board, the
          project, and their board.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-lg border border-[#E8E4DC] overflow-hidden text-sm">
          {(
            [
              ['year', 'Year board'],
              ['mine', 'My board'],
              ['project', 'Project'],
              ['calendar', 'Calendar'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 ${view === id ? 'bg-[#085508] text-white' : 'bg-white text-[#1A1A2E]'}`}
              onClick={() => {
                setView(id)
                if (id === 'project' && !selectedProjectId && projects[0]) {
                  setSelectedProjectId(projects[0].id)
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={schoolYear}
          onChange={(e) => setSchoolYear(e.target.value)}
          className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {view === 'project' ? (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm min-w-[12rem]"
          >
            <option value="">Pick a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.leadName || p.leadRole}
              </option>
            ))}
          </select>
        ) : null}
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={includeDone}
            onChange={(e) => setIncludeDone(e.target.checked)}
          />
          Show done
        </label>
      </div>

      {/* Add project */}
      <details className="rounded-lg border border-[#E8E4DC] p-3 bg-[#FAFAF8]">
        <summary className="text-xs font-bold text-[#5A6070] cursor-pointer">
          Add a project (your swimlane on the year board)
        </summary>
        <div className="mt-3 space-y-2">
          <input
            value={projTitle}
            onChange={(e) => setProjTitle(e.target.value)}
            placeholder="Project name (e.g. Fall Festival, Spirit Wear drop)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={projDesc}
            onChange={(e) => setProjDesc(e.target.value)}
            rows={2}
            placeholder="What this project covers (optional)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={projLeadRole}
            onChange={(e) => setProjLeadRole(e.target.value)}
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            {(isAdmin ? ['admin', 'marketing', 'secretary', 'treasurer', 'events', 'programs', 'retail', 'membership', 'wellness'] : myRoles).map(
              (role) => (
                <option key={role} value={role}>
                  Lead role: {role}
                </option>
              ),
            )}
          </select>
          <div>
            <p className="text-xs text-[#5A6070] mb-1">Project members (who can add / get assigned work)</p>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {directory.map((p) => (
                <label key={p.email} className="inline-flex items-center gap-1 text-xs border border-[#E8E4DC] rounded-full px-2 py-1">
                  <input
                    type="checkbox"
                    checked={projMembers.includes(p.email)}
                    onChange={() => toggleMember(p.email)}
                  />
                  {p.name || p.email}
                </label>
              ))}
            </div>
          </div>
          <Button
            disabled={busy || !projTitle.trim()}
            onClick={() => void createProject()}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {busy ? '…' : 'Add project'}
          </Button>
        </div>
      </details>

      {/* Add task */}
      <div className="rounded-lg border border-[#E8E4DC] p-3 space-y-2 bg-[#FAFAF8]">
        <p className="text-xs font-bold text-[#5A6070]">Add a task under a project</p>
        <input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="What needs to happen?"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          rows={2}
          placeholder="Details (optional)"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            value={taskProjectId || selectedProjectId}
            onChange={(e) => setTaskProjectId(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            value={taskAssignee}
            onChange={(e) => setTaskAssignee(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Assign later (after you talk)</option>
            {assigneeChoices.map((p) => (
              <option key={p.email} value={p.email}>
                {personLabel(p)}
              </option>
            ))}
          </select>
          <select
            value={taskOwnerRole}
            onChange={(e) => setTaskOwnerRole(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            {Array.from(new Set([...myRoles, 'admin', 'marketing', 'events', 'programs', 'treasurer', 'secretary', 'retail', 'membership', 'wellness'])).map(
              (role) => (
                <option key={role} value={role}>
                  Role lane: {role}
                </option>
              ),
            )}
          </select>
          <input
            type="datetime-local"
            value={taskDueLocal}
            onChange={(e) => setTaskDueLocal(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <Button
          disabled={busy || !taskTitle.trim() || !(taskProjectId || selectedProjectId)}
          onClick={() => void createTask()}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? '…' : 'Add task'}
        </Button>
      </div>

      {loading ? <p className="text-xs text-[#5A6070]">Loading…</p> : null}

      {/* Year swimlanes */}
      {!loading && view === 'year' ? (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-xs text-[#5A6070]">No projects yet for {schoolYear}. Add one above.</p>
          ) : null}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {projects.map((project) => {
              const laneTasks = tasksByProject.get(project.id) ?? []
              const canEdit =
                isAdmin || project.leadEmail === myEmail || project.memberEmails.includes(myEmail)
              return (
                <div
                  key={project.id}
                  className="min-w-[260px] max-w-[300px] flex-shrink-0 rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] p-3 space-y-2"
                >
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setView('project')
                    }}
                  >
                    <p className="text-sm font-bold">{project.title}</p>
                    <p className="text-[11px] text-[#5A6070]">
                      {project.leadName || project.leadEmail} · {project.leadRole}
                    </p>
                  </button>
                  {laneTasks.length === 0 ? (
                    <p className="text-[11px] text-[#5A6070]">No open tasks</p>
                  ) : null}
                  <div className="space-y-2">{laneTasks.map((t) => renderTaskCard(t))}</div>
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        setSelectedProjectId(project.id)
                        setTaskProjectId(project.id)
                        setView('project')
                      }}
                    >
                      Open project
                    </Button>
                  ) : null}
                </div>
              )
            })}
            {(tasksByProject.get('__none__') ?? []).length > 0 ? (
              <div className="min-w-[260px] max-w-[300px] flex-shrink-0 rounded-xl border border-dashed border-[#E8E4DC] bg-white p-3 space-y-2">
                <p className="text-sm font-bold">Unassigned / triage</p>
                <div className="space-y-2">
                  {(tasksByProject.get('__none__') ?? []).map((t) => renderTaskCard(t))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* My board */}
      {!loading && view === 'mine' ? (
        <div className="space-y-3">
          <p className="text-xs text-[#5A6070]">
            Tasks assigned to you, that you created, or on projects you lead.
          </p>
          {tasks.length === 0 ? (
            <p className="text-xs text-[#5A6070]">Nothing on your board right now.</p>
          ) : null}
          <div className="space-y-2">
            {tasks.map((t) =>
              renderTaskCard(t, projects.find((p) => p.id === t.projectId)?.title),
            )}
          </div>
        </div>
      ) : null}

      {/* Month calendar by due date */}
      {!loading && view === 'calendar' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <StaffMonthCalendar
            month={calMonth}
            onMonthChange={(d) => {
              setCalMonth(d)
              setCalSelectedDate(null)
            }}
            events={calendarEvents}
            selectedDate={calSelectedDate}
            onSelectDate={(iso) => {
              setCalSelectedDate(iso)
              setTaskDueLocal(`${iso}T17:00`)
            }}
            onSelectEvent={(id) => {
              const task = tasks.find((t) => t.id === id)
              if (!task?.dueAt) return
              setCalSelectedDate(task.dueAt.slice(0, 10))
            }}
          />
          <div className="space-y-3">
            <div className="rounded-xl border border-[#E8E4DC] bg-white p-3">
              <h3 className="text-sm font-semibold">
                {calSelectedDate
                  ? new Date(`${calSelectedDate}T12:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Select a day'}
              </h3>
              <p className="mt-1 text-xs text-[#5A6070]">
                Tasks with a due date appear on the grid. Click a day, then use Add a task above.
              </p>
              {calSelectedDate && calDayTasks.length === 0 ? (
                <p className="mt-2 text-xs text-[#5A6070]">No tasks due this day.</p>
              ) : null}
              <div className="mt-2 space-y-2">
                {calDayTasks.map((t) =>
                  renderTaskCard(t, projectTitleById.get(t.projectId)),
                )}
              </div>
            </div>
            {undatedTasks.length > 0 ? (
              <div className="rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] p-3">
                <h3 className="text-sm font-semibold">No due date</h3>
                <div className="mt-2 space-y-2">
                  {undatedTasks.slice(0, 8).map((t) =>
                    renderTaskCard(t, projectTitleById.get(t.projectId)),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Single project */}
      {!loading && view === 'project' ? (
        <div className="space-y-3">
          {!selectedProject ? (
            <p className="text-xs text-[#5A6070]">Pick a project above, or add one.</p>
          ) : (
            <>
              <div className="rounded-lg border border-[#E8E4DC] p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{selectedProject.title}</p>
                    <p className="text-xs text-[#5A6070]">
                      Lead: {selectedProject.leadName || selectedProject.leadEmail} ·{' '}
                      {selectedProject.memberEmails.length} members
                    </p>
                  </div>
                  {(isAdmin || selectedProject.leadEmail === myEmail) && selectedProject.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void patchProject(selectedProject.id, { status: 'done' })}
                    >
                      Mark project done
                    </Button>
                  ) : null}
                </div>
                {selectedProject.description ? (
                  <p className="text-xs text-[#5A6070] whitespace-pre-wrap">{selectedProject.description}</p>
                ) : null}
                {(isAdmin || selectedProject.leadEmail === myEmail) ? (
                  <div>
                    <p className="text-xs font-bold text-[#5A6070] mb-1">Members</p>
                    <div className="flex flex-wrap gap-2">
                      {directory.map((p) => {
                        const on = selectedProject.memberEmails.includes(p.email) || selectedProject.leadEmail === p.email
                        return (
                          <label
                            key={p.email}
                            className="inline-flex items-center gap-1 text-xs border border-[#E8E4DC] rounded-full px-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={busy || p.email === selectedProject.leadEmail}
                              onChange={() => {
                                const next = on
                                  ? selectedProject.memberEmails.filter((e) => e !== p.email)
                                  : [...selectedProject.memberEmails, p.email]
                                void patchProject(selectedProject.id, { memberEmails: next })
                              }}
                            />
                            {p.name || p.email}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                {(tasksByProject.get(selectedProject.id) ?? []).length === 0 ? (
                  <p className="text-xs text-[#5A6070]">No tasks yet. Add one above.</p>
                ) : null}
                {(tasksByProject.get(selectedProject.id) ?? []).map((t) => renderTaskCard(t))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
