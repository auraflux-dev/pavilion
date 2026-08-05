/**
 * Litecard. Apple / Google Wallet passes with Square GAN as the scannable barcode.
 * Litecard holds Pass Type signing; we only create/update cards via their API.
 *
 * Env (Vercel):
 *   LITECARD_USERNAME, LITECARD_PASSWORD, LITECARD_TEMPLATE_ID
 * Optional:
 *   LITECARD_BASE_URL (demo: https://bff-api.demo.litecard.io)
 *   LITECARD_BUSINESS_ID (x-active-business-id)
 *   LITECARD_WELCOME_BASE (demo: https://main.demo.litecard.io/welcome?id=)
 *   LITECARD_FIELD_BARCODE / LITECARD_FIELD_BALANCE / LITECARD_FIELD_CARD_NUMBER
 *   LITECARD_BALANCE_FORMAT=cents when Balance is an integer field (pointsKey)
 *   LITECARD_SEND_LEGACY_ALIASES=true only if template allows memberId/giftcardgan
 *
 * Demo Cove template uses cardNumber = Square GAN (barcode.fieldMap) and
 * pointsKey = balance in integer cents. Token expires_in is typically 24h.
 */
import { getWixClient } from '@/lib/wix-client'

const DEFAULT_BASE = 'https://bff-api.enterprise.litecard.io'
const DEFAULT_WELCOME = 'https://app.litecard.io/welcome/?id='

type TokenCache = { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null

export type LitecardPassLinks = {
  cardId: string
  downloadId: string
  welcomeUrl: string
  appleLink: string
  googleLink: string
}

export function litecardConfigured(): boolean {
  return Boolean(
    process.env.LITECARD_USERNAME?.trim() &&
      process.env.LITECARD_PASSWORD?.trim() &&
      process.env.LITECARD_TEMPLATE_ID?.trim(),
  )
}

function baseUrl(): string {
  return (process.env.LITECARD_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '')
}

function welcomeBase(): string {
  return process.env.LITECARD_WELCOME_BASE?.trim() || DEFAULT_WELCOME
}

function fieldBarcode(): string {
  return (process.env.LITECARD_FIELD_BARCODE?.trim() || 'barcodevalue').toLowerCase()
}

function fieldBalance(): string {
  return (process.env.LITECARD_FIELD_BALANCE?.trim() || 'balance').toLowerCase()
}

function fieldCardNumber(): string {
  return (process.env.LITECARD_FIELD_CARD_NUMBER?.trim() || 'cardnumber').toLowerCase()
}

function authHeaders(token: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const biz = process.env.LITECARD_BUSINESS_ID?.trim()
  if (biz) h['x-active-business-id'] = biz
  return h
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token

  const username = process.env.LITECARD_USERNAME!.trim()
  const password = process.env.LITECARD_PASSWORD!.trim()
  const res = await fetch(`${baseUrl()}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    message?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Litecard auth failed (${res.status})`)
  }
  const expiresIn = Number(data.expires_in ?? 3600)
  tokenCache = {
    token: data.access_token,
    expiresAt: now + Math.max(60, expiresIn) * 1000,
  }
  return data.access_token
}

function balanceAsCents(): boolean {
  const mode = (process.env.LITECARD_BALANCE_FORMAT || '').trim().toLowerCase()
  if (mode === 'cents' || mode === 'integer') return true
  // Demo Cove template uses pointsKey as integer cents.
  return fieldBalance() === 'pointskey'
}

function buildCardPayload(opts: {
  email: string
  firstName?: string
  lastName?: string
  gan: string
  balanceDollars?: number
}): Record<string, string | number> {
  const gan = opts.gan.replace(/\D/g, '')
  const barcodeKey = fieldBarcode()
  const cardNumberKey = fieldCardNumber()
  const balanceKey = fieldBalance()
  const payload: Record<string, string | number> = {
    email: opts.email.trim().toLowerCase(),
  }
  if (opts.firstName?.trim()) payload.firstName = opts.firstName.trim()
  if (opts.lastName?.trim()) payload.lastName = opts.lastName.trim()

  // Square GAN → scannable QR (template barcode.fieldMap should point at this key).
  if (barcodeKey) payload[barcodeKey] = gan
  // Optional display card number (may be the same key as barcode on Cove template).
  if (cardNumberKey && cardNumberKey !== barcodeKey) {
    const mask =
      process.env.LITECARD_MASK_CARD_NUMBER === 'true' && gan.length > 4
        ? `•••• ${gan.slice(-4)}`
        : gan
    payload[cardNumberKey] = mask
  }

  if (opts.balanceDollars != null && Number.isFinite(opts.balanceDollars) && balanceKey) {
    if (balanceAsCents()) {
      payload[balanceKey] = Math.round(Number(opts.balanceDollars) * 100)
    } else {
      payload[balanceKey] = `$${Number(opts.balanceDollars).toFixed(2)}`
    }
  }

  // Only add legacy aliases when explicitly enabled (strict templates reject extras).
  if (process.env.LITECARD_SEND_LEGACY_ALIASES === 'true') {
    payload.memberId = gan
    payload.giftcardgan = gan
  }
  return payload
}

function linksFromResponse(data: Record<string, unknown>): LitecardPassLinks {
  const cardId = String(data.cardId ?? data.id ?? '')
  const downloadId = String(data.downloadId ?? '')
  const welcomeUrl = downloadId
    ? `${welcomeBase()}${encodeURIComponent(downloadId)}`
    : String(data.redirectUrl ?? '')
  return {
    cardId,
    downloadId,
    welcomeUrl,
    appleLink: String(data.appleLink ?? ''),
    googleLink: String(data.googleLink ?? ''),
  }
}

async function createCard(opts: {
  email: string
  firstName?: string
  lastName?: string
  gan: string
  balanceDollars?: number
}): Promise<LitecardPassLinks> {
  const token = await getAccessToken()
  const templateId = process.env.LITECARD_TEMPLATE_ID!.trim()
  const body = {
    templateId,
    externalId: opts.gan.replace(/\D/g, ''),
    cardPayload: buildCardPayload(opts),
    options: {
      emailInvitationEnabled: false,
      smsInvitationEnabled: false,
      fastCreate: true,
    },
  }
  const res = await fetch(`${baseUrl()}/api/v1/card`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.status === 409) {
 // Already exists. try update by stored id or re-fetch via get
    throw Object.assign(new Error('Litecard card already exists'), { code: 'EXISTS', data })
  }
  if (!res.ok) {
    throw new Error(
      String(data.message ?? data.error ?? `Litecard create failed (${res.status})`),
    )
  }
  const links = linksFromResponse(data)
  if (!links.cardId && !links.downloadId) {
    throw new Error('Litecard create returned no cardId/downloadId')
  }
  return links
}

async function updateCard(opts: {
  cardId: string
  email: string
  firstName?: string
  lastName?: string
  gan: string
  balanceDollars?: number
}): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${baseUrl()}/api/v1/card`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({
      cardId: opts.cardId,
      cardPayload: buildCardPayload(opts),
    }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(
      String(data.message ?? data.error ?? `Litecard update failed (${res.status})`),
    )
  }
}

async function getCard(cardId: string): Promise<LitecardPassLinks | null> {
  const token = await getAccessToken()
  const res = await fetch(`${baseUrl()}/api/v1/card/${encodeURIComponent(cardId)}`, {
    headers: authHeaders(token),
  })
  if (res.status === 404) return null
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(data.message ?? data.error ?? `Litecard get failed (${res.status})`))
  }
  // Response may nest under `card`
  const card = (data.card as Record<string, unknown> | undefined) ?? data
  return linksFromResponse({
    ...card,
    cardId: card.id ?? card.cardId ?? cardId,
  })
}

async function readMembershipLitecard(email: string): Promise<{
  membershipId: string | null
  cardId: string
  downloadId: string
  gan: string
  row: Record<string, unknown> | null
}> {
  const client = getWixClient()
  const res = await client.items.query('Memberships').eq('email', email).limit(1).find()
  const row = (res.items?.[0] as Record<string, unknown> | undefined) ?? null
  return {
    membershipId: row?._id ? String(row._id) : null,
    cardId: String(row?.litecardCardId ?? '').trim(),
    downloadId: String(row?.litecardDownloadId ?? '').trim(),
    gan: String(row?.litecardGan ?? '').trim(),
    row,
  }
}

async function writeMembershipLitecard(
  email: string,
  links: LitecardPassLinks,
  gan: string,
): Promise<void> {
  const client = getWixClient()
  const existing = await client.items.query('Memberships').eq('email', email).limit(1).find()
  const row = existing.items?.[0] as Record<string, unknown> | undefined
  const payload = {
    email,
    litecardCardId: links.cardId || undefined,
    litecardDownloadId: links.downloadId || undefined,
    litecardGan: gan,
  }
  if (row?._id) {
    await client.items.update('Memberships', {
      ...row,
      ...payload,
      _id: String(row._id),
    } as never)
  } else {
    await client.items.insert('Memberships', {
      ...payload,
      status: 'active',
      tier: 'free',
    } as never)
  }
}

/**
 * Ensure a Litecard Wallet pass exists for this family's Square GAN.
 * Returns Apple/Google/smart links for the portal "Add to Wallet" button.
 */
export async function ensureCoveLitecardPass(opts: {
  parentEmail: string
  gan: string
  balanceDollars?: number
  firstName?: string
  lastName?: string
}): Promise<LitecardPassLinks> {
  if (!litecardConfigured()) {
    throw new Error('Litecard is not configured (set LITECARD_USERNAME/PASSWORD/TEMPLATE_ID)')
  }
  const email = opts.parentEmail.trim().toLowerCase()
  const gan = opts.gan.replace(/\D/g, '')
  if (!email || gan.length < 12) {
    throw new Error('parentEmail and Square GAN required for Litecard')
  }

  const stored = await readMembershipLitecard(email)

  if (stored.cardId && stored.gan === gan) {
    try {
      await updateCard({
        cardId: stored.cardId,
        email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        gan,
        balanceDollars: opts.balanceDollars,
      })
    } catch (err) {
      console.warn('Litecard update failed; will try recreate', err)
    }
    const fresh = await getCard(stored.cardId).catch(() => null)
    if (fresh?.cardId || fresh?.downloadId) {
      const links = {
        ...fresh,
        downloadId: fresh.downloadId || stored.downloadId,
        welcomeUrl:
          fresh.welcomeUrl ||
          (stored.downloadId ? `${welcomeBase()}${encodeURIComponent(stored.downloadId)}` : ''),
      }
      await writeMembershipLitecard(email, links, gan).catch(() => {})
      return links
    }
    // Fall through to create if get failed
  }

  try {
    const created = await createCard({
      email,
      firstName: opts.firstName,
      lastName: opts.lastName,
      gan,
      balanceDollars: opts.balanceDollars,
    })
    await writeMembershipLitecard(email, created, gan)
    return created
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'EXISTS' && stored.cardId) {
      await updateCard({
        cardId: stored.cardId,
        email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        gan,
        balanceDollars: opts.balanceDollars,
      })
      const links: LitecardPassLinks = {
        cardId: stored.cardId,
        downloadId: stored.downloadId,
        welcomeUrl: stored.downloadId
          ? `${welcomeBase()}${encodeURIComponent(stored.downloadId)}`
          : '',
        appleLink: '',
        googleLink: '',
      }
      await writeMembershipLitecard(email, links, gan)
      return links
    }
    throw err
  }
}

/** Push live Square balance onto an existing Litecard pass (webhook). */
export async function syncLitecardBalanceForGan(
  ganRaw: string,
  balanceDollars: number,
): Promise<boolean> {
  if (!litecardConfigured()) return false
  const gan = ganRaw.replace(/\D/g, '')
  if (!gan) return false

  const client = getWixClient()
  const students = await client.items.query('Students').eq('squareGiftCardGan', gan).limit(5).find()
  const student = students.items?.[0] as { parentEmail?: string } | undefined
  const email = String(student?.parentEmail ?? '')
    .trim()
    .toLowerCase()
  if (!email) return false

  const stored = await readMembershipLitecard(email)
  if (!stored.cardId) return false

  await updateCard({
    cardId: stored.cardId,
    email,
    gan,
    balanceDollars,
  })
  return true
}
