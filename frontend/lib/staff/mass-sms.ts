/**
 * Mass SMS stub. Real Twilio send stays off until FEATURE_MASS_SMS=1
 * and member reach codes are in place (product decision).
 */
import 'server-only'

export type MassSmsDraft = {
  audience: string
  body: string
  recipientCount: number
  phones: string[]
}

export function massSmsEnabled(): boolean {
  return process.env.FEATURE_MASS_SMS === '1' || process.env.FEATURE_MASS_SMS === 'true'
}

export function normalizeSmsPhone(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export function buildMassSmsDraft(input: {
  audience: string
  body: string
  phones: string[]
}): MassSmsDraft {
  const unique = Array.from(
    new Set(input.phones.map(normalizeSmsPhone).filter((p): p is string => Boolean(p))),
  )
  return {
    audience: input.audience,
    body: input.body.trim().slice(0, 320),
    recipientCount: unique.length,
    phones: unique,
  }
}

export type MassSmsSendResult = {
  ok: boolean
  mode: 'disabled' | 'dry-run' | 'sent'
  draft: MassSmsDraft
  message?: string
}

/** Stub sender. Never hits a carrier unless FEATURE_MASS_SMS is on and TWILIO_* is wired later. */
export async function sendMassSmsStub(draft: MassSmsDraft): Promise<MassSmsSendResult> {
  if (!massSmsEnabled()) {
    return {
      ok: false,
      mode: 'disabled',
      draft,
      message:
        'Mass SMS is gated until member portal reach is ready.\nSet FEATURE_MASS_SMS=1 to dry-run.',
    }
  }
  // Dry-run only for now (no Twilio credentials required).
  return {
    ok: true,
    mode: 'dry-run',
    draft,
    message: `Dry-run: would send to ${draft.recipientCount} numbers.`,
  }
}
