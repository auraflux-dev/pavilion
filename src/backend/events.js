/**
 * Forwards paid store / eCom orders to the Next.js membership sync webhook.
 *
 * Webhook URL is stored in CMS SiteSettings:
 *   key   = membershipOrdersWebhookUrl
 *   value = https://…/api/webhooks/wix-orders?token=…
 *
 * Publish the site after updating that setting.
 */

import wixData from 'wix-data';
import { fetch } from 'wix-fetch';

async function getWebhookUrl() {
  const results = await wixData
    .query('SiteSettings')
    .eq('key', 'membershipOrdersWebhookUrl')
    .limit(1)
    .find({ suppressAuth: true });

  return results.items?.[0]?.value || '';
}

async function forwardPaidOrder(order) {
  try {
    const url = await getWebhookUrl();
    if (!url) {
      console.error('SiteSettings.membershipOrdersWebhookUrl missing');
      return;
    }

    const paymentStatus = String(order?.paymentStatus || '').toUpperCase();
    if (paymentStatus && !paymentStatus.includes('PAID') && paymentStatus !== 'APPROVED') {
      return;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });

    const text = await res.text();
    console.log('membership webhook', res.status, text.slice(0, 300));
  } catch (err) {
    console.error('membership webhook forward failed', err);
  }
}

/** Classic Stores (legacy) */
export function wixStores_onOrderPaid(event) {
  return forwardPaidOrder(event);
}

/** eCommerce — fires when payment status changes */
export function wixEcom_onOrderPaymentStatusUpdated(event) {
  const order =
    event?.order ||
    event?.entity ||
    event?.data?.order ||
    event?.actionEvent?.body?.order ||
    event;
  return forwardPaidOrder(order);
}

/** eCommerce — order approved (often paid) */
export function wixEcom_onOrderApproved(event) {
  const order =
    event?.order ||
    event?.entity ||
    event?.data?.order ||
    event?.actionEvent?.body?.order ||
    event;
  return forwardPaidOrder(order);
}
