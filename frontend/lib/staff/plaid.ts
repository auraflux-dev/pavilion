/**
 * Plaid client for SHMS PTO Staff → Budget (Bank of America).
 * Access tokens stay server-side in StaffPlaidItems. Never send them to the browser.
 */
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

export function plaidEnvName() {
  const raw = (process.env.PLAID_ENV || 'production').trim().toLowerCase()
  if (raw === 'sandbox' || raw === 'development' || raw === 'production') return raw
  return 'production'
}

export function plaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET?.trim())
}

export function plaidRedirectUri() {
  return (
    process.env.PLAID_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')}/staff`
  )
}

export function plaidWebhookUrl() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
  return process.env.PLAID_WEBHOOK_URL?.trim() || `${base}/api/staff/plaid/webhook`
}

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID?.trim()
  const secret = process.env.PLAID_SECRET?.trim()
  if (!clientId || !secret) throw new Error('PLAID_CLIENT_ID / PLAID_SECRET are not set')
  const env = plaidEnvName()
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    }),
  )
}

export function plaidLinkProducts() {
  return [Products.Transactions]
}

export function plaidCountryCodes() {
  return [CountryCode.Us]
}

export function plaidAxiosError(err: unknown): { code: string; message: string } | null {
  const data = (err as { response?: { data?: { error_code?: string; error_message?: string } } })
    ?.response?.data
  if (!data?.error_code && !data?.error_message) return null
  return {
    code: String(data.error_code ?? ''),
    message: String(data.error_message ?? 'Plaid request failed'),
  }
}
