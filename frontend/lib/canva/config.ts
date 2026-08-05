/**
 * Canva Connect config for Staff Marketing.
 * Reuses the CWN Connect app client id/secret when set on Vercel;
 * redirect URI must be registered in the Canva Developer Portal.
 */
export const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize'
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
export const CANVA_API_BASE = 'https://api.canva.com/rest/v1'

/** Scopes for browse + open designs + brand assets awareness. */
export const CANVA_SCOPES = [
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  'folder:read',
  'asset:read',
  'profile:read',
].join(' ')

export function canvaClientConfigured(): boolean {
  return Boolean(
    process.env.CANVA_CLIENT_ID?.trim() && process.env.CANVA_CLIENT_SECRET?.trim(),
  )
}

export function canvaSharedTokenConfigured(): boolean {
  return Boolean(
    process.env.CANVA_REFRESH_TOKEN?.trim() || process.env.CANVA_ACCESS_TOKEN?.trim(),
  )
}

export function canvaRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/staff/canva/connect/callback`
}

export function canvaRedirectBase(reqHost: string): string {
  const fixed = process.env.CANVA_OAUTH_REDIRECT_BASE?.replace(/\/$/, '')
  if (fixed) return fixed
  const host = reqHost.split(',')[0].trim().toLowerCase()
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`
  }
  if (
    host === 'www.shmspto.org' ||
    host === 'shmspto.org' ||
    host.endsWith('.vercel.app')
  ) {
    return `https://${host}`
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
}
