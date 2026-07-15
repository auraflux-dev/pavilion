const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { exec } = require('child_process')

const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
]

const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
const key = Object.keys(oauthRaw)[0]
const { client_id, client_secret } = oauthRaw[key]

const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3333/oauth2callback')

const url = oAuth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' })

console.log('\nOpening browser for auth...')
exec(`open "${url}"`)

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) return
  const code = new URL(req.url, 'http://localhost:3333').searchParams.get('code')
  res.end('<h1>Auth complete — you can close this tab.</h1>')
  server.close()
  const { tokens } = await oAuth2.getToken(code)
  fs.writeFileSync(CREDS_PATH, JSON.stringify(tokens, null, 2))
  console.log('✅ Credentials saved to', CREDS_PATH)
}).listen(3333)

console.log('Waiting for browser redirect...')
