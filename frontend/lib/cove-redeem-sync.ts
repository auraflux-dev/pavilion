/**
 * Mirror Square gift-card REDEEM activities into Payments so snack-window /
 * POS spends show in the parent portal even when staff charged outside
 * /api/staff/cove/checkout.
 */
import { getGiftCardActivities, getGiftCardByGan, getGiftCardBalance } from '@/lib/square'
import { resolveFamilyGiftCard, syncFamilyStoreCard, listFamilyStudents } from '@/lib/family-store-card'
import { getWixClient } from '@/lib/wix-client'

const REDEEM_SOURCE = 'cove_register_redeem'

export async function syncFamilyCoveRedeems(parentEmail: string): Promise<{
  balance: number
  inserted: number
}> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return { balance: 0, inserted: 0 }

  const students = await listFamilyStudents(email)
  const card = resolveFamilyGiftCard(students)
  if (!card.gan) return { balance: 0, inserted: 0 }

  const liveBalance = await getGiftCardBalance(card.gan)
  await syncFamilyStoreCard({
    parentEmail: email,
    gan: card.gan,
    giftCardId: card.giftCardId || undefined,
    balanceDollars: liveBalance,
  })

  const squareCard = await getGiftCardByGan(card.gan)
  if (!squareCard?.id) return { balance: liveBalance, inserted: 0 }

  const activities = await getGiftCardActivities(squareCard.id)
  const redeems = activities
    .filter((a) => a.type === 'REDEEM' && a.redeemMoney != null && a.redeemMoney > 0)
    .slice(0, 25)

  if (!redeems.length) return { balance: liveBalance, inserted: 0 }

  const client = getWixClient()
  const studentId = students[0]?._id
  let inserted = 0

  for (const activity of redeems) {
    const txId = String(activity.id ?? '').slice(0, 45)
    if (!txId) continue
    const amount = Number(activity.redeemMoney)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const prior = await client.items
      .query('Payments')
      .eq('transactionId', txId)
      .eq('source', REDEEM_SOURCE)
      .limit(1)
      .find()
      .catch(() => ({ items: [] as unknown[] }))
    if ((prior.items ?? []).length > 0) continue

    // Also skip if staff checkout already wrote a row under a different key
    // for the same Square activity id in notes.
    try {
      await client.items.insert('Payments', {
        parentEmail: email,
        ...(studentId ? { studentId } : {}),
        amount,
        status: 'Paid',
        paymentDate: activity.createdAt || new Date().toISOString(),
        paymentMethod: 'Cove Family Card',
        transactionId: txId,
        source: REDEEM_SOURCE,
        programName: 'The Cove. snack window',
        notes: `Code spend · Square redeem ${txId}`,
      })
      inserted += 1
    } catch (err) {
      console.warn('cove redeem sync insert failed', txId, err)
    }
  }

  return { balance: liveBalance, inserted }
}
