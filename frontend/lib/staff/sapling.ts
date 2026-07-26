/**
 * Sapling.ai grammar / spelling edits for staff email compose.
 * Uses server-only SAPLING_API_KEY. never expose to the browser.
 * @see https://sapling.ai/docs/api/edits-overview/
 */

export type SaplingEdit = {
  id?: string
  start: number
  end: number
  replacement: string
  sentence?: string
  sentence_start?: number
  error_type?: string
  general_error_type?: string
}

export type SaplingCheckResult = {
  ok: boolean
  appliedText: string
  edits: SaplingEdit[]
  error?: string
}

export function saplingConfigured(): boolean {
  return Boolean(process.env.SAPLING_API_KEY?.trim())
}

export async function checkGrammarWithSapling(
  text: string,
  sessionId = 'shmspto-staff-mail',
): Promise<SaplingCheckResult> {
  const key = process.env.SAPLING_API_KEY?.trim()
  if (!key) {
    return { ok: false, appliedText: text, edits: [], error: 'SAPLING_API_KEY is not configured' }
  }
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, appliedText: text, edits: [], error: 'Nothing to check' }
  }

  // Sapling recommends chunking very long text; board emails are short.
  const res = await fetch('https://api.sapling.ai/api/v1/edits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      text: trimmed,
      session_id: sessionId.slice(0, 128),
      auto_apply: true,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    edits?: SaplingEdit[]
    applied_text?: string
    msg?: string
    error?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      appliedText: text,
      edits: [],
      error: data.msg || data.error || `Sapling error (${res.status})`,
    }
  }

  return {
    ok: true,
    appliedText: data.applied_text ?? trimmed,
    edits: Array.isArray(data.edits) ? data.edits : [],
  }
}
