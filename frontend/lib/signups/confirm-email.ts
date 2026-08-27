import { isDemoInstance } from '@/lib/demo/instance'
import { sendMassEmail } from '@/lib/staff/mass-email'
import type { SignupRegistration, SignupSheet } from '@/lib/signups/types'

export async function sendSignupConfirmationEmail(opts: {
  sheet: SignupSheet
  registrations: SignupRegistration[]
  confirmUrl: string
}): Promise<{ sent: boolean; mode: string; error?: string }> {
  const email = opts.registrations[0]?.participantEmail
  if (!email) return { sent: false, mode: 'unavailable', error: 'No email' }
  if (opts.sheet.settings.sendConfirmationEmail === false) {
    return { sent: false, mode: 'skipped' }
  }

  const slots = opts.registrations
    .map((r) => `• ${r.slotTitle} (qty ${r.quantity})`)
    .join('\n')
  const body = [
    `Hi ${opts.registrations[0].participantName},`,
    '',
    `You're signed up for: ${opts.sheet.title}`,
    opts.sheet.location ? `Location: ${opts.sheet.location}` : '',
    '',
    'Your slots:',
    slots,
    '',
    `Confirmation: ${opts.confirmUrl}`,
    '',
    'Thanks!',
  ]
    .filter(Boolean)
    .join('\n')

  // Demo: never call mass-email (audience sanitizers reject fixture domains).
  if (isDemoInstance()) {
    return { sent: false, mode: 'demo_preview' }
  }

  const result = await sendMassEmail(
    {
      subject: `Confirmed: ${opts.sheet.title}`,
      body,
      recipients: [email],
      fromName: opts.sheet.title.slice(0, 40) || 'Sign-up',
    },
    {
      // Missing Gmail: dry-run so claim still succeeds on product trials
      dryRun: !process.env.GMAIL_REFRESH_TOKEN,
      allowInternal: true,
    },
  )

  if (!result.ok && result.mode === 'unavailable') {
    return { sent: false, mode: result.mode, error: result.errors[0] }
  }
  return {
    sent: result.ok && result.mode === 'gmail',
    mode: result.mode,
  }
}
