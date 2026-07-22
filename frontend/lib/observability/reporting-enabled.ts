/** Shared client/server check for the error-reporting env signal. */
export function readErrorReportingFlag(raw: string | undefined): boolean {
  const v = (raw || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}
