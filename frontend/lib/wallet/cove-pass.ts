/**
 * Apple Wallet (.pkpass) + Google Wallet save URL for the family Cove Digital Card.
 * Requires PTO certs in Vercel env (see .env.example).
 */
import { PKPass } from 'passkit-generator'

function pemFromEnv(raw: string | undefined): string {
  if (!raw?.trim()) return ''
  let v = raw.trim()
  // Support base64-wrapped PEMs and literal \n in Vercel env values
  if (!v.includes('BEGIN') && /^[A-Za-z0-9+/=]+$/.test(v.replace(/\s/g, ''))) {
    v = Buffer.from(v.replace(/\s/g, ''), 'base64').toString('utf8')
  }
  return v.replace(/\\n/g, '\n')
}

/** Minimal 29×29 green PNG (icon) — Apple requires icon.png */
function tinyGreenPng(): Buffer {
  // 1x1 green pixel PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )
}

export function appleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_WALLET_PASS_TYPE_ID?.trim() &&
      process.env.APPLE_WALLET_TEAM_ID?.trim() &&
      pemFromEnv(process.env.APPLE_WALLET_SIGNER_CERT) &&
      pemFromEnv(process.env.APPLE_WALLET_SIGNER_KEY) &&
      pemFromEnv(process.env.APPLE_WALLET_WWDR_CERT),
  )
}

export function googleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID?.trim() &&
      process.env.GOOGLE_WALLET_SA_EMAIL?.trim() &&
      pemFromEnv(process.env.GOOGLE_WALLET_SA_PRIVATE_KEY),
  )
}

export async function buildCoveApplePass(opts: {
  code: string
  payload: string
  parentEmail: string
  balance?: number
}): Promise<Buffer> {
  const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID!.trim()
  const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID!.trim()
  const wwdr = pemFromEnv(process.env.APPLE_WALLET_WWDR_CERT)
  const signerCert = pemFromEnv(process.env.APPLE_WALLET_SIGNER_CERT)
  const signerKey = pemFromEnv(process.env.APPLE_WALLET_SIGNER_KEY)
  const passphrase = process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE?.trim() || undefined

  const icon = tinyGreenPng()
  const balanceLabel =
    opts.balance != null && Number.isFinite(opts.balance)
      ? `Balance $${Number(opts.balance).toFixed(2)}`
      : 'Family Cove Digital Card'

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier,
    serialNumber: `cove-${opts.code}-${opts.parentEmail.slice(0, 24)}`,
    teamIdentifier,
    organizationName: 'SHMS PTO',
    description: 'SHMS PTO Cove Digital Card',
    logoText: 'SHMS PTO Cove',
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(8, 85, 8)',
    labelColor: 'rgb(255, 215, 0)',
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: opts.payload,
        messageEncoding: 'iso-8859-1',
        altText: opts.code,
      },
    ],
    storeCard: {
      primaryFields: [
        {
          key: 'code',
          label: 'FAMILY CODE',
          value: opts.code,
        },
      ],
      secondaryFields: [
        {
          key: 'balance',
          label: 'STATUS',
          value: balanceLabel,
        },
      ],
      backFields: [
        {
          key: 'howto',
          label: 'At The Cove',
          value:
            'Show this pass or say the 6-digit code. Staff charges your prepaid Cove Digital Card balance. No cash at the snack window.',
        },
        {
          key: 'email',
          label: 'Parent',
          value: opts.parentEmail,
        },
      ],
    },
  }

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': icon,
      'paula.r@example.org': icon,
      'logo.png': icon,
      'logo@2x.png': icon,
    },
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase: passphrase,
    },
  )

  return pass.getAsBuffer()
}

/**
 * Google Wallet "Save" URL (generic JWT). Requires a service account with Wallet API access
 * and an issuer id from Google Pay & Wallet Console.
 */
export async function buildCoveGoogleWalletUrl(opts: {
  code: string
  payload: string
  parentEmail: string
  balance?: number
}): Promise<string> {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!.trim()
  const saEmail = process.env.GOOGLE_WALLET_SA_EMAIL!.trim()
  const saKey = pemFromEnv(process.env.GOOGLE_WALLET_SA_PRIVATE_KEY)
  const classId = `${issuerId}.shms_cove_digital_card`
  const objectId = `${issuerId}.cove_${opts.code}`

  const claims = {
    iss: saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId,
          cardTitle: {
            defaultValue: { language: 'en-US', value: 'SHMS PTO Cove Digital Card' },
          },
          header: {
            defaultValue: { language: 'en-US', value: opts.code },
          },
          subheader: {
            defaultValue: {
              language: 'en-US',
              value:
                opts.balance != null
                  ? `Balance $${Number(opts.balance).toFixed(2)}`
                  : 'Show at The Cove snack window',
            },
          },
          barcode: {
            type: 'QR_CODE',
            value: opts.payload,
            alternateText: opts.code,
          },
          hexBackgroundColor: '#085508',
        },
      ],
    },
  }

  // Minimal RS256 JWT without adding googleapis dependency
  const header = { alg: 'RS256', typ: 'JWT' }
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64url')
  const unsigned = `${enc(header)}.${enc(claims)}`
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned)
  sign.end()
  const signature = sign.sign(saKey, 'base64url')
  const token = `${unsigned}.${signature}`
  return `https://pay.google.com/gp/v/save/${token}`
}
