import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function keyBytes() {
  const secret =
    process.env.ACCOUNT_SESSION_SECRET?.trim() ||
    process.env.SEO_TOKEN_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    'dev-seo-token-secret'
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`
}

export function decryptSecret(packed: string): string {
  const [v, ivB, tagB, dataB] = packed.split(':')
  if (v !== 'v1' || !ivB || !tagB || !dataB) throw new Error('Invalid secret payload')
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivB, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function googleOAuthClient() {
  const clientId =
    process.env.SEO_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GMAIL_CLIENT_ID?.trim() ||
    ''
  const clientSecret =
    process.env.SEO_GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GMAIL_CLIENT_SECRET?.trim() ||
    ''
  return { clientId, clientSecret }
}

export function googleOAuthConfigured() {
  const { clientId, clientSecret } = googleOAuthClient()
  return Boolean(clientId && clientSecret)
}

export function pagespeedApiKey() {
  return process.env.PAGESPEED_API_KEY?.trim() || process.env.GOOGLE_PSI_API_KEY?.trim() || ''
}

export function googleOAuthBlockedReason(): string | null {
  if (googleOAuthConfigured()) return null
  return [
    'GSC connect is blocked until env is set:',
    'SEO_GOOGLE_CLIENT_ID and SEO_GOOGLE_CLIENT_SECRET',
    '(or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_OAUTH_CLIENT_*).',
    'Redirect URI: {origin}/api/staff/seo/oauth/google/callback',
    'Optional: SEO_GOOGLE_REDIRECT_URI to override.',
  ].join('\n')
}
