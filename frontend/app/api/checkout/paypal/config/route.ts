import { NextResponse } from 'next/server'
import { getPayPalPublicConfig } from '@/lib/paypal'

/** Public PayPal Client ID + whether server secret is present. */
export async function GET() {
  return NextResponse.json(getPayPalPublicConfig())
}
