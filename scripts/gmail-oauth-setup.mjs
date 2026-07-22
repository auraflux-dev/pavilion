/**
 * One-time OAuth for Gmail send (Google Workspace).
 *
 * Prerequisites:
 * 1. Google Cloud Console → create/select project
 * 2. Enable "Gmail API"
 * 3. OAuth consent screen: Internal (Workspace) or External testing
 * 4. Credentials → OAuth client ID → Desktop app (or Web with http://127.0.0.1:42813)
 * 5. Copy Client ID + Client Secret
 *
 * Run (from repo root):
 *   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-oauth-setup.mjs
 *
 * Sign in as the Workspace mailbox that should send (e.g. membership@shmspto.org).
 * Then add the printed env vars to Vercel Production.
 */
import http from 'node:http'
import { URL } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const PORT = 42813
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`
const SCOPE = 'https://www.googleapis.com/auth/gmail.send'

const clientId =
  process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
const clientSecret =
  process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

if (!clientId || !clientSecret) {
  console.error(
    'Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET (or GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET), then re-run.',
  )
  process.exit(1)
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', REDIRECT)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')

console.log('\n1) In Google Cloud OAuth client, add authorized redirect URI:')
console.log(`   ${REDIRECT}`)
console.log('\n2) Open this URL and sign in as the sending mailbox:\n')
console.log(authUrl.toString())
console.log('\nWaiting for Google redirect…\n')

const code = await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
      if (u.pathname !== '/oauth2callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      const err = u.searchParams.get('error')
      const authCode = u.searchParams.get('code')
      if (err || !authCode) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end(`OAuth error: ${err || 'missing code'}`)
        reject(new Error(err || 'missing code'))
        server.close()
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Gmail connected</h1><p>You can close this tab and return to the terminal.</p>')
      resolve(authCode)
      server.close()
    } catch (e) {
      reject(e)
      server.close()
    }
  })
  server.listen(PORT, '127.0.0.1')
})

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT,
    grant_type: 'authorization_code',
  }),
})
const tokens = await tokenRes.json()
if (!tokenRes.ok || !tokens.refresh_token) {
  console.error('Token exchange failed:', tokens)
  console.error(
    'Tip: If refresh_token is missing, revoke prior access at https://myaccount.google.com/permissions and re-run with prompt=consent.',
  )
  process.exit(1)
}

const rl = createInterface({ input, output })
const senderEnv = process.env.GMAIL_SENDER?.trim()
const fromNameEnv = process.env.GMAIL_FROM_NAME?.trim()
const sender =
  senderEnv ||
  (await rl.question('Sending Workspace email (e.g. membership@shmspto.org): ')).trim() ||
  'membership@shmspto.org'
const fromName =
  fromNameEnv || (await rl.question('From display name [SHMS PTO]: ')).trim() || 'SHMS PTO'
rl.close()

if (!tokens.refresh_token) {
  console.error('No refresh_token returned. Revoke prior access and re-run with prompt=consent.')
  process.exit(1)
}

const out = [
  `GMAIL_CLIENT_ID=${clientId}`,
  `GMAIL_CLIENT_SECRET=${clientSecret}`,
  `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`,
  `GMAIL_SENDER=${sender}`,
  `GMAIL_FROM_NAME=${fromName}`,
].join('\n')

const outPath = process.env.GMAIL_ENV_OUT?.trim() || '/tmp/shmspto-gmail.env'
await import('node:fs/promises').then((fs) => fs.writeFile(outPath, out + '\n', { mode: 0o600 }))

console.log('\nWrote env file (do not commit):', outPath)
console.log('Sender:', sender)
console.log('From name:', fromName)
console.log('Refresh token: present')
console.log('\nNext: add GMAIL_* to Vercel Production and redeploy.')
console.log('Staff → Memberships / purchase confirmations will send via Gmail.')
