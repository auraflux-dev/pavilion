/**
 * StaffTasks — work items under a StaffProject, assignable to a person.
 * Still supports role ownership + triage for faculty/admin asks.
 */

export const TASK_STATUSES = ['triage', 'open', 'blocked', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_SOURCES = ['board', 'faculty', 'admin'] as const
export type TaskSource = (typeof TASK_SOURCES)[number]

export type StaffTask = {
  id: string
  title: string
  description: string
  projectId: string
  ownerRole: string
  assigneeEmail: string
  assigneeName: string
  status: TaskStatus
  dueAt: string | null
  blockedByTaskId: string
  blockedByNote: string
  requestedBy: string
  source: TaskSource
  createdByEmail: string
  createdByName: string
  createdAt: string
  updatedAt: string
  active: boolean
}

export function normalizeStatus(value: unknown): TaskStatus {
  const s = String(value ?? '').trim().toLowerCase()
  return (TASK_STATUSES as readonly string[]).includes(s) ? (s as TaskStatus) : 'open'
}

export function normalizeSource(value: unknown): TaskSource {
  const s = String(value ?? '').trim().toLowerCase()
  return (TASK_SOURCES as readonly string[]).includes(s) ? (s as TaskSource) : 'board'
}
