/**
 * Peer-to-peer fundraising: org campaigns + personal share pages.
 * Money still flows through existing donation checkout; we credit raised_cents after pay.
 */
import 'server-only'

import { randomBytes, randomUUID } from 'crypto'
import { sqlForOrg } from '@/lib/crm/tenant'
import { pavilionCmsEnabled, resolveCmsOrganizationId } from '@/lib/cms/store'

export type P2pCampaign = {
  id: string
  slug: string
  title: string
  story: string
  goalCents: number
  active: boolean
  raisedCents: number
  pageCount: number
}

export type P2pPage = {
  id: string
  campaignId: string
  shareCode: string
  ownerEmail: string
  ownerName: string
  blurb: string
  raisedCents: number
  active: boolean
  campaignTitle?: string
  campaignStory?: string
  campaignGoalCents?: number
  campaignSlug?: string
}

function newShareCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function resolveP2pOrgId(req?: Request): Promise<string | null> {
  return resolveCmsOrganizationId(req)
}

export async function listP2pCampaigns(orgId: string): Promise<P2pCampaign[]> {
  if (!pavilionCmsEnabled()) return []
  const res = await sqlForOrg<{
    id: string
    slug: string
    title: string
    story: string
    goal_cents: number
    active: boolean
    raised_cents: string
    page_count: string
  }>(
    orgId,
    `select c.id, c.slug, c.title, c.story, c.goal_cents, c.active,
            coalesce((select sum(p.raised_cents) from cms_p2p_pages p
                       where p.campaign_id = c.id and p.organization_id = c.organization_id), 0)::text as raised_cents,
            (select count(*)::text from cms_p2p_pages p
              where p.campaign_id = c.id and p.organization_id = c.organization_id) as page_count
       from cms_p2p_campaigns c
      where c.organization_id = $1
      order by c.updated_at desc`,
    [orgId],
  )
  return res.rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    story: r.story,
    goalCents: r.goal_cents,
    active: r.active,
    raisedCents: Number(r.raised_cents || 0),
    pageCount: Number(r.page_count || 0),
  }))
}

export async function createP2pCampaign(input: {
  orgId: string
  title: string
  story?: string
  goalCents?: number
  slug?: string
}): Promise<P2pCampaign> {
  const id = randomUUID()
  const title = input.title.trim()
  if (!title) throw new Error('title required')
  const slug =
    (input.slug || title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || id.slice(0, 8)
  const goalCents = Math.max(0, Math.round(Number(input.goalCents) || 0))
  const story = (input.story || '').trim()
  await sqlForOrg(
    input.orgId,
    `insert into cms_p2p_campaigns (id, organization_id, slug, title, story, goal_cents)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, input.orgId, slug, title, story, goalCents],
  )
  return {
    id,
    slug,
    title,
    story,
    goalCents,
    active: true,
    raisedCents: 0,
    pageCount: 0,
  }
}

export async function setP2pCampaignActive(
  orgId: string,
  campaignId: string,
  active: boolean,
): Promise<void> {
  await sqlForOrg(
    orgId,
    `update cms_p2p_campaigns set active = $3, updated_at = now()
      where organization_id = $1 and id = $2`,
    [orgId, campaignId, active],
  )
}

export async function listP2pPagesForCampaign(
  orgId: string,
  campaignId: string,
): Promise<P2pPage[]> {
  if (!pavilionCmsEnabled()) return []
  const res = await sqlForOrg<{
    id: string
    campaign_id: string
    share_code: string
    owner_email: string
    owner_name: string
    blurb: string
    raised_cents: number
    active: boolean
  }>(
    orgId,
    `select id, campaign_id, share_code, owner_email, owner_name, blurb, raised_cents, active
       from cms_p2p_pages
      where organization_id = $1 and campaign_id = $2
      order by raised_cents desc, updated_at desc
      limit 200`,
    [orgId, campaignId],
  )
  return res.rows.map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    shareCode: r.share_code,
    ownerEmail: r.owner_email,
    ownerName: r.owner_name,
    blurb: r.blurb,
    raisedCents: r.raised_cents,
    active: r.active,
  }))
}

export async function createP2pPage(input: {
  orgId: string
  campaignId: string
  ownerEmail: string
  ownerName: string
  blurb?: string
}): Promise<P2pPage> {
  const email = input.ownerEmail.trim().toLowerCase()
  if (!email) throw new Error('owner email required')
  const campaignOk = await sqlForOrg<{ id: string }>(
    input.orgId,
    `select id from cms_p2p_campaigns
      where organization_id = $1 and id = $2 and active = true
      limit 1`,
    [input.orgId, input.campaignId],
  )
  if (!campaignOk.rows[0]) throw new Error('Campaign not found or inactive')

  const existing = await sqlForOrg<{
    id: string
    campaign_id: string
    share_code: string
    owner_email: string
    owner_name: string
    blurb: string
    raised_cents: number
    active: boolean
  }>(
    input.orgId,
    `select id, campaign_id, share_code, owner_email, owner_name, blurb, raised_cents, active
       from cms_p2p_pages
      where organization_id = $1 and campaign_id = $2 and owner_email = $3
      limit 1`,
    [input.orgId, input.campaignId, email],
  )
  if (existing.rows[0]) {
    const r = existing.rows[0]
    return {
      id: r.id,
      campaignId: r.campaign_id,
      shareCode: r.share_code,
      ownerEmail: r.owner_email,
      ownerName: r.owner_name,
      blurb: r.blurb,
      raisedCents: r.raised_cents,
      active: r.active,
    }
  }

  const id = randomUUID()
  let shareCode = newShareCode()
  for (let i = 0; i < 5; i++) {
    try {
      await sqlForOrg(
        input.orgId,
        `insert into cms_p2p_pages
          (id, organization_id, campaign_id, share_code, owner_email, owner_name, blurb)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          input.orgId,
          input.campaignId,
          shareCode,
          email,
          input.ownerName.trim() || email.split('@')[0],
          (input.blurb || '').trim().slice(0, 500),
        ],
      )
      break
    } catch {
      shareCode = newShareCode()
      if (i === 4) throw new Error('Could not allocate share code')
    }
  }
  return {
    id,
    campaignId: input.campaignId,
    shareCode,
    ownerEmail: email,
    ownerName: input.ownerName.trim() || email.split('@')[0],
    blurb: (input.blurb || '').trim().slice(0, 500),
    raisedCents: 0,
    active: true,
  }
}

export async function getP2pPageByShareCode(
  orgId: string,
  shareCode: string,
): Promise<P2pPage | null> {
  if (!pavilionCmsEnabled()) return null
  const code = shareCode.trim().toUpperCase()
  if (!code) return null
  const res = await sqlForOrg<{
    id: string
    campaign_id: string
    share_code: string
    owner_email: string
    owner_name: string
    blurb: string
    raised_cents: number
    active: boolean
    campaign_title: string
    campaign_story: string
    campaign_goal_cents: number
    campaign_slug: string
    campaign_active: boolean
  }>(
    orgId,
    `select p.id, p.campaign_id, p.share_code, p.owner_email, p.owner_name, p.blurb,
            p.raised_cents, p.active,
            c.title as campaign_title, c.story as campaign_story,
            c.goal_cents as campaign_goal_cents, c.slug as campaign_slug,
            c.active as campaign_active
       from cms_p2p_pages p
       join cms_p2p_campaigns c on c.id = p.campaign_id and c.organization_id = p.organization_id
      where p.organization_id = $1 and p.share_code = $2
      limit 1`,
    [orgId, code],
  )
  const r = res.rows[0]
  if (!r || !r.active || !r.campaign_active) return null
  return {
    id: r.id,
    campaignId: r.campaign_id,
    shareCode: r.share_code,
    ownerEmail: r.owner_email,
    ownerName: r.owner_name,
    blurb: r.blurb,
    raisedCents: r.raised_cents,
    active: r.active,
    campaignTitle: r.campaign_title,
    campaignStory: r.campaign_story,
    campaignGoalCents: r.campaign_goal_cents,
    campaignSlug: r.campaign_slug,
  }
}

export async function creditP2pPageRaised(
  orgId: string,
  shareCode: string,
  amountCents: number,
): Promise<void> {
  if (!pavilionCmsEnabled() || amountCents <= 0) return
  const code = shareCode.trim().toUpperCase()
  if (!code) return
  await sqlForOrg(
    orgId,
    `update cms_p2p_pages
        set raised_cents = raised_cents + $3, updated_at = now()
      where organization_id = $1 and share_code = $2 and active = true`,
    [orgId, code, amountCents],
  )
}

export async function listMyP2pPages(orgId: string, email: string): Promise<P2pPage[]> {
  if (!pavilionCmsEnabled()) return []
  const res = await sqlForOrg<{
    id: string
    campaign_id: string
    share_code: string
    owner_email: string
    owner_name: string
    blurb: string
    raised_cents: number
    active: boolean
    campaign_title: string
  }>(
    orgId,
    `select p.id, p.campaign_id, p.share_code, p.owner_email, p.owner_name, p.blurb,
            p.raised_cents, p.active, c.title as campaign_title
       from cms_p2p_pages p
       join cms_p2p_campaigns c on c.id = p.campaign_id and c.organization_id = p.organization_id
      where p.organization_id = $1 and p.owner_email = $2
      order by p.updated_at desc`,
    [orgId, email.trim().toLowerCase()],
  )
  return res.rows.map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    shareCode: r.share_code,
    ownerEmail: r.owner_email,
    ownerName: r.owner_name,
    blurb: r.blurb,
    raisedCents: r.raised_cents,
    active: r.active,
    campaignTitle: r.campaign_title,
  }))
}
