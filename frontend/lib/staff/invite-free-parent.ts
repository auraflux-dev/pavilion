/**
 * In-person free-parent invite helpers.
 * Staff collect an email at the table → create/find Wix member → send set-password / join link.
 */
import { createClient, ApiKeyStrategy, OAuthStrategy } from '@wix/sdk'
import { members } from '@wix/members'
import { approvePendingMemberById } from '@/lib/auth-approve-member'
import { sendMassEmail } from '@/lib/staff/mass-email'

export const PUBLIC_JOIN_PATH = '/join'

export function siteOriginFromRequest(req: {
  headers: { get(name: string): string | null }
}): string {
  const raw = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    'www.shmspto.org'
  )
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()
  if (raw === 'shmspto.org' || raw === 'www.shmspto.org') {
    return 'https://www.shmspto.org'
  }
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
  return `${proto}://${raw}`
}

export function buildJoinUrl(origin: string, opts?: { login?: boolean }): string {
  const base = `${origin.replace(/\/$/, '')}${PUBLIC_JOIN_PATH}`
  return opts?.login ? `${base}?mode=login` : base
}

export function buildInviteSmsText(joinUrl: string): string {
  return `Join SHMS PTO free (about 1 min): ${joinUrl}`
}

function adminMembersClient() {
  const siteId = process.env.WIX_SITE_ID?.trim()
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!siteId || !apiKey) {
    throw new Error('WIX_SITE_ID and WIX_API_KEY must be set')
  }
  return createClient({
    modules: { members },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  })
}

export type FindOrCreateFreeMemberResult = {
  memberId: string
  created: boolean
  alreadyMember: boolean
}

export async function findOrCreateFreeMember(input: {
  email: string
  firstName?: string
  lastName?: string
}): Promise<FindOrCreateFreeMemberResult> {
  const email = input.email.trim().toLowerCase()
  const client = adminMembersClient()

  const existing = await client.members
    .queryMembers()
    .eq('loginEmail', email)
    .limit(1)
    .find()
  const found = existing.items?.[0] as { _id?: string; status?: string } | undefined
  const foundId = found?._id
  if (foundId) {
    await approvePendingMemberById(foundId, String(found?.status || ''))
    return { memberId: foundId, created: false, alreadyMember: true }
  }

  const firstName = (input.firstName || '').trim()
  const lastName = (input.lastName || '').trim()
  const nickname =
    [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]

  const created = await client.members.createMember({
    member: {
      loginEmail: email,
      status: 'APPROVED',
      privacyStatus: 'PRIVATE',
      profile: { nickname },
      contact: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        emails: [email],
      },
    },
  })

  const id = created._id
  if (!id) throw new Error('Wix did not return a member id after create')
  return { memberId: id, created: true, alreadyMember: false }
}

/** Wix-hosted set-password / reset email (works for API-created members). */
export async function sendWixSetPasswordEmail(
  email: string,
  redirectUri: string,
): Promise<{ ok: boolean; error?: string }> {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID?.trim()
  if (!clientId) return { ok: false, error: 'Wix client id not configured' }

  try {
    const client = createClient({
      auth: OAuthStrategy({ clientId }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)
    await client.auth.sendPasswordResetEmail(email, redirectUri)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Wix reset email failed',
    }
  }
}

export async function sendStaffInviteEmail(input: {
  email: string
  firstName?: string
  joinUrl: string
  alreadyMember: boolean
  created: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const name = (input.firstName || '').trim()
  const hello = name ? `Hi ${name},` : 'Hi,'
  const subject = input.alreadyMember
    ? 'SHMS PTO. Finish signing in to your parent account'
    : 'SHMS PTO. Create your free parent account'

  const body = [
    hello,
    '',
    input.alreadyMember
      ? 'A PTO volunteer at an event asked us to send you a sign-in link for your Stone Hill Middle School PTO parent account.'
      : 'A PTO volunteer at an event started a free SHMS PTO parent account for you.',
    '',
    input.created || !input.alreadyMember
      ? 'Open this link to set your password and enter the member portal:'
      : 'Open this link to log in (or use Forgot password if you need a reset):',
    input.joinUrl,
    '',
    'Once you’re in, you can add students, buy paid membership (Reef / Lagoon / Tide), and load a Cove Digital Card.',
    '',
    'Questions? Email vp-membershipexperience@shmspto.org',
    '',
    'SHMS PTO',
  ].join('\n')

  const mail = await sendMassEmail({
    subject,
    body,
    fromName: 'SHMS PTO Membership',
    replyTo: 'vp-membershipexperience@shmspto.org',
    recipients: [input.email],
  })

  if (!mail.ok) {
    return { ok: false, error: mail.errors?.[0] || 'Email send failed' }
  }
  return { ok: true }
}
