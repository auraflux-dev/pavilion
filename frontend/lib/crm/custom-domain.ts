/**
 * Add a school’s own domain on the Commons Vercel project.
 * Treasurer still creates CNAME/A at their registrar; we attach the hostname and show the records.
 */

export type DnsRecord = {
  type: string
  name: string
  value: string
}

export function recommendedRecords(domain: string): DnsRecord[] {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const isApex = host.split('.').length === 2
  if (isApex) {
    return [
      { type: 'A', name: '@', value: '76.76.21.21' },
      { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' },
    ]
  }
  const sub = host.split('.')[0]
  return [{ type: 'CNAME', name: sub, value: 'cname.vercel-dns.com' }]
}

function vercelAuth(): { token: string; teamId: string; projectId: string } | null {
  const token = process.env.VERCEL_TOKEN?.trim() || process.env.COMMONS_VERCEL_TOKEN?.trim()
  const teamId = process.env.COMMONS_VERCEL_TEAM_ID?.trim()
  // Require an explicit project id. Never default to a hard-coded Vercel project
  // (avoids SHMS / wrong-target deploys attaching domains to the wrong app).
  const projectId = process.env.COMMONS_VERCEL_PROJECT_ID?.trim()
  if (!token || !teamId || !projectId) return null
  return { token, teamId, projectId }
}

export function vercelDomainConfigured(): boolean {
  return Boolean(vercelAuth())
}

export async function addCommonsDomain(domain: string): Promise<{
  domain: string
  verified: boolean
  records: DnsRecord[]
  verification: DnsRecord[]
  note: string
}> {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!host || /\s/.test(host) || !host.includes('.')) {
    throw new Error('Enter a domain like pto.yourschool.org or yourpto.org')
  }
  const records = recommendedRecords(host)
  const auth = vercelAuth()
  if (!auth) {
    return {
      domain: host,
      verified: false,
      records,
      verification: [],
      note: 'Vercel is not connected on this project yet. Add the records below at your DNS host. We will attach the domain when COMMONS_VERCEL_TOKEN is set.',
    }
  }
  const addUrl = new URL(`https://api.vercel.com/v10/projects/${auth.projectId}/domains`)
  addUrl.searchParams.set('teamId', auth.teamId)
  const addRes = await fetch(addUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: host }),
  })
  const addJson = (await addRes.json()) as {
    name?: string
    verified?: boolean
    error?: { message?: string }
    verification?: { type?: string; domain?: string; value?: string }[]
  }
  if (!addRes.ok && !/already|taken|exists/i.test(addJson.error?.message || '')) {
    throw new Error(addJson.error?.message || 'Could not add domain on Vercel')
  }
  const configUrl = new URL(`https://api.vercel.com/v6/domains/${host}/config`)
  configUrl.searchParams.set('teamId', auth.teamId)
  const cfgRes = await fetch(configUrl, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  const cfg = (await cfgRes.json().catch(() => ({}))) as {
    misconfigured?: boolean
    configuredBy?: string
  }
  const verification: DnsRecord[] = (addJson.verification || []).map((v) => ({
    type: (v.type || 'TXT').toUpperCase(),
    name: v.domain || host,
    value: v.value || '',
  }))
  return {
    domain: host,
    verified: Boolean(addJson.verified) && cfg.misconfigured !== true,
    records,
    verification,
    note: addJson.verified
      ? 'Domain is on the Commons app. SSL finishes after DNS propagates (often under an hour).'
      : 'Domain attached. Add the records below, wait for DNS, then tap Check again.',
  }
}

export async function checkCommonsDomain(domain: string): Promise<{
  domain: string
  verified: boolean
  records: DnsRecord[]
  note: string
}> {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const records = recommendedRecords(host)
  const auth = vercelAuth()
  if (!auth) {
    return {
      domain: host,
      verified: false,
      records,
      note: 'Add the records at your DNS host. Set COMMONS_VERCEL_TOKEN to auto-check from Staff.',
    }
  }
  const url = new URL(`https://api.vercel.com/v6/domains/${host}/config`)
  url.searchParams.set('teamId', auth.teamId)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
  const json = (await res.json()) as { misconfigured?: boolean; error?: { message?: string } }
  if (!res.ok) {
    return {
      domain: host,
      verified: false,
      records,
      note: json.error?.message || 'Domain is not on the Commons project yet. Use Add domain first.',
    }
  }
  const ok = json.misconfigured === false
  return {
    domain: host,
    verified: ok,
    records,
    note: ok
      ? 'DNS looks good. HTTPS should be live.'
      : 'Vercel still sees old DNS. Wait, or confirm CNAME/A at your registrar.',
  }
}
