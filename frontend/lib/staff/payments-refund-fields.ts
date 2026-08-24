/** CMS fields on Payments used by Staff → Refunds. */

export const PAYMENTS_REFUND_FIELDS = [
  { key: 'refundStatus', displayName: 'Refund Status', type: 'TEXT' },
  { key: 'refundRequestNote', displayName: 'Refund Request Note', type: 'TEXT' },
  { key: 'refundStaffNote', displayName: 'Refund Staff Note', type: 'TEXT' },
  { key: 'refundRequestedBy', displayName: 'Refund Requested By', type: 'TEXT' },
  { key: 'refundRequestedAt', displayName: 'Refund Requested At', type: 'DATETIME' },
  { key: 'refundApprovedBy', displayName: 'Refund Approved By', type: 'TEXT' },
  { key: 'refundApprovedAt', displayName: 'Refund Approved At', type: 'DATETIME' },
  { key: 'refundDeniedReason', displayName: 'Refund Denied Reason', type: 'TEXT' },
  { key: 'refundProviderId', displayName: 'Refund Provider Id', type: 'TEXT' },
  { key: 'refundError', displayName: 'Refund Error', type: 'TEXT' },
  { key: 'refundAmountDollars', displayName: 'Refund Amount Dollars', type: 'TEXT' },
  { key: 'refundedAmountDollars', displayName: 'Refunded Amount Dollars', type: 'TEXT' },
  { key: 'adjustmentType', displayName: 'Adjustment Type', type: 'TEXT' },
  { key: 'refundDestination', displayName: 'Refund Destination', type: 'TEXT' },
  { key: 'exchangeNote', displayName: 'Exchange Note', type: 'TEXT' },
  { key: 'rebilledAmountDollars', displayName: 'Rebilled Amount Dollars', type: 'TEXT' },
] as const

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export async function ensurePaymentsRefundFields() {
  const headers = wixHeaders()
  const getRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/Payments', {
    method: 'GET',
    headers,
  })
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
    message?: string
  }
  if (!getRes.ok) {
    throw new Error(getBody.message || `Could not read Payments collection (${getRes.status})`)
  }

  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  const created: string[] = []
  const already: string[] = []

  for (const field of PAYMENTS_REFUND_FIELDS) {
    if (existing.has(field.key)) {
      already.push(field.key)
      continue
    }
    const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dataCollectionId: 'Payments', field }),
    })
    if (createRes.ok) {
      created.push(field.key)
      continue
    }
    const err = (await createRes.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `Could not add field ${field.key}`)
  }

  return { ok: true as const, created, existing: already }
}
