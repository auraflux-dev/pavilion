import 'server-only'
import { SquareClient, SquareEnvironment } from 'square'

function assertAurafluxSquareToken(token: string) {
  if (process.env.SQUARE_SELLER_LABEL?.toLowerCase().includes('stone')) {
    throw new Error('Refusing Stone Hill Square seller. Use Auraflux Square only.')
  }
  if (process.env.SQUARE_SELLER_LABEL?.toLowerCase().includes('shms')) {
    throw new Error('Refusing SHMS Square seller. Use Auraflux Square only.')
  }
  if (!token.trim()) throw new Error('SQUARE_ACCESS_TOKEN missing')
}

export function squareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN?.trim() &&
      process.env.SQUARE_LOCATION_ID?.trim() &&
      process.env.SQUARE_COMMONS_PLAN_VARIATION_ID?.trim(),
  )
}

export function getSquareClient(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim() || ''
  assertAurafluxSquareToken(token)
  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  })
}

export function squareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID?.trim()
  if (!id) throw new Error('SQUARE_LOCATION_ID missing')
  return id
}

export function commonsPlanVariationId(): string {
  const id = process.env.SQUARE_COMMONS_PLAN_VARIATION_ID?.trim()
  if (!id) throw new Error('SQUARE_COMMONS_PLAN_VARIATION_ID missing')
  return id
}

export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}
