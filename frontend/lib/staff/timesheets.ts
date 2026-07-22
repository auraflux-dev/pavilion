/**
 * Contractor / instructor timesheets — submitted to VP Programs for approval.
 * Collection: ContractorTimesheets
 */
import { getWixClient } from '@/lib/wix-client'

export type TimesheetStatus = 'Submitted' | 'Approved' | 'Rejected'

export type ContractorTimesheet = {
  id: string
  staffEmail: string
  staffName: string
  programId: string
  programName: string
  workDate: string
  startTime: string
  endTime: string
  hours: number
  notes: string
  status: TimesheetStatus
  submittedAt: string
  reviewedByEmail: string
  reviewedAt: string
  reviewNote: string
}

const COLLECTION = 'ContractorTimesheets'

function parseHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map((n) => Number(n) || 0)
  const [eh, em] = endTime.split(':').map((n) => Number(n) || 0)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  if (end <= start) throw new Error('End time must be after start time')
  return Math.round(((end - start) / 60) * 100) / 100
}

function mapRow(row: Record<string, unknown>): ContractorTimesheet {
  return {
    id: String(row._id ?? ''),
    staffEmail: String(row.staffEmail ?? '').toLowerCase(),
    staffName: String(row.staffName ?? ''),
    programId: String(row.programId ?? ''),
    programName: String(row.programName ?? ''),
    workDate: String(row.workDate ?? '').slice(0, 10),
    startTime: String(row.startTime ?? ''),
    endTime: String(row.endTime ?? ''),
    hours: Number(row.hours ?? 0) || 0,
    notes: String(row.notes ?? ''),
    status: (String(row.status ?? 'Submitted') as TimesheetStatus) || 'Submitted',
    submittedAt: String(row.submittedAt ?? row._createdDate ?? ''),
    reviewedByEmail: String(row.reviewedByEmail ?? ''),
    reviewedAt: String(row.reviewedAt ?? ''),
    reviewNote: String(row.reviewNote ?? ''),
  }
}

export async function listTimesheets(opts?: {
  staffEmail?: string
  status?: TimesheetStatus
}): Promise<ContractorTimesheet[]> {
  const client = getWixClient()
  let q = client.items.query(COLLECTION).descending('workDate').limit(200)
  if (opts?.staffEmail) {
    q = q.eq('staffEmail', opts.staffEmail.trim().toLowerCase())
  }
  if (opts?.status) {
    q = q.eq('status', opts.status)
  }
  const res = await q.find()
  return (res.items ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function createTimesheet(input: {
  staffEmail: string
  staffName: string
  programId: string
  programName: string
  workDate: string
  startTime: string
  endTime: string
  notes?: string
}): Promise<ContractorTimesheet> {
  const workDate = String(input.workDate ?? '').trim().slice(0, 10)
  const startTime = String(input.startTime ?? '').trim()
  const endTime = String(input.endTime ?? '').trim()
  const programId = String(input.programId ?? '').trim()
  const programName = String(input.programName ?? '').trim()
  if (!workDate) throw new Error('Work date is required')
  if (!startTime || !endTime) throw new Error('Start and end time are required')
  if (!programId || !programName) throw new Error('Select a program')

  const hours = parseHours(startTime, endTime)
  const client = getWixClient()
  const row = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    staffName: String(input.staffName ?? '').trim(),
    programId,
    programName,
    workDate,
    startTime,
    endTime,
    hours,
    notes: String(input.notes ?? '').trim(),
    status: 'Submitted' as TimesheetStatus,
    submittedAt: new Date().toISOString(),
    reviewedByEmail: '',
    reviewedAt: '',
    reviewNote: '',
  }
  const inserted = await client.items.insert(COLLECTION, row)
  return mapRow({ ...row, _id: (inserted as { _id?: string })._id })
}

export async function reviewTimesheet(opts: {
  id: string
  action: 'approve' | 'reject'
  reviewedByEmail: string
  reviewNote?: string
}): Promise<ContractorTimesheet> {
  const client = getWixClient()
  const existing = (await client.items.get(COLLECTION, opts.id)) as Record<string, unknown>
  if (!existing?._id) throw new Error('Timesheet not found')
  const status: TimesheetStatus = opts.action === 'approve' ? 'Approved' : 'Rejected'
  const updates = {
    ...existing,
    _id: opts.id,
    status,
    reviewedByEmail: opts.reviewedByEmail.trim().toLowerCase(),
    reviewedAt: new Date().toISOString(),
    reviewNote: String(opts.reviewNote ?? '').trim(),
  }
  await client.items.update(COLLECTION, updates as never)
  return mapRow(updates)
}
