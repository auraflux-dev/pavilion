/**
 * SHMS PTO — Backend HTTP Functions
 * Receives webhooks from Cheddarup
 * Exposes store card balance endpoint for member portal
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

// POST /_functions/cheddarupWebhook
// Set this URL in Cheddarup: Settings → Webhooks
export async function post_cheddarupWebhook(request) {
    try {
        const body = await request.body.json();
        const { event, payer, amount, collection, items, payment_id } = body;

        if (event !== 'payment.completed') {
            return ok({ received: true, processed: false });
        }

        await wixData.insert('Payments', {
            payerEmail:          (payer?.email || '').toLowerCase(),
            payerName:           payer?.name || '',
            amount:              parseFloat(amount) || 0,
            source:              'cheddarup',
            collectionName:      collection?.name || '',
            itemDescription:     (items || []).map(i => i.name).join(', '),
            transactionId:       payment_id || '',
            paidAt:              new Date(),
            syncedToMoneyMinder: false
        }, { suppressAuth: true });

        return ok({ received: true, processed: true });
    } catch(err) {
        console.error('cheddarupWebhook error:', err);
        return serverError({ error: 'internal error' });
    }
}

// GET /_functions/storeCardBalance?email=xxx
// Called by member portal to show student card balance
export async function get_storeCardBalance(request) {
    try {
        const email = request.query?.email;
        if (!email) return badRequest({ error: 'email required' });

        const results = await wixData.query('Students')
            .eq('parentEmail', email.toLowerCase().trim())
            .find({ suppressAuth: true });

        const students = results.items.map(s => ({
            name:    `${s.firstName} ${s.lastName}`,
            grade:   s.grade,
            balance: s.storeCardBalance || 0,
            hasCard: !!s.storeCardCode
        }));

        return ok({ students });
    } catch(err) {
        console.error('storeCardBalance error:', err);
        return serverError({ error: 'internal error' });
    }
}
