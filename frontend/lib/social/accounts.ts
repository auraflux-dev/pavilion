/**
 * List connected Wix Social Publisher accounts (Facebook / Instagram).
 */
function wixHeaders(apiKey: string, siteId: string) {
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    Accept: 'application/json',
  }
}

export type WixSocialAccount = {
  channel: 'FACEBOOK' | 'INSTAGRAM'
  accountId: string
  pageId?: string
  username?: string
  displayName?: string
  isDefault?: boolean
}

type ListAccountsResponse = {
  accounts?: Array<{
    channelName?: string
    facebook?: {
      id?: string
      _id?: string
      displayName?: string
      page?: { id?: string; _id?: string; displayName?: string }
      settings?: { default?: boolean }
    }
    instagram?: {
      id?: string
      _id?: string
      username?: string
      displayName?: string
      settings?: { default?: boolean }
    }
  }>
  message?: string
}

export async function listWixSocialAccounts(
  channel: 'FACEBOOK' | 'INSTAGRAM',
): Promise<WixSocialAccount[]> {
  const apiKey = process.env.WIX_API_KEY?.trim()
  const siteId = process.env.WIX_SITE_ID?.trim()
  if (!apiKey || !siteId) return []

  const res = await fetch(
    `https://www.wixapis.com/social-publisher/v1/accounts?channelName=${channel}`,
    { headers: wixHeaders(apiKey, siteId), cache: 'no-store' },
  )
  const body = (await res.json().catch(() => ({}))) as ListAccountsResponse
  if (!res.ok) {
    console.warn('listWixSocialAccounts', channel, res.status, body.message)
    return []
  }

  const out: WixSocialAccount[] = []
  for (const row of body.accounts ?? []) {
    if (channel === 'INSTAGRAM' && row.instagram) {
      const accountId = String(row.instagram.id ?? row.instagram._id ?? '').trim()
      if (!accountId) continue
      out.push({
        channel: 'INSTAGRAM',
        accountId,
        username: row.instagram.username,
        displayName: row.instagram.displayName,
        isDefault: row.instagram.settings?.default === true,
      })
    }
    if (channel === 'FACEBOOK' && row.facebook) {
      const accountId = String(row.facebook.id ?? row.facebook._id ?? '').trim()
      const pageId = String(row.facebook.page?.id ?? row.facebook.page?._id ?? '').trim()
      if (!accountId) continue
      out.push({
        channel: 'FACEBOOK',
        accountId,
        pageId: pageId || undefined,
        displayName: row.facebook.displayName ?? row.facebook.page?.displayName,
        isDefault: row.facebook.settings?.default === true,
      })
    }
  }
  return out
}

export function pickDefaultAccount(accounts: WixSocialAccount[]): WixSocialAccount | null {
  if (!accounts.length) return null
  return accounts.find((a) => a.isDefault) ?? accounts[0] ?? null
}
