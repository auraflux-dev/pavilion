/**
 * SHMS PTO — CMS Data Hooks
 * Auto-fires when collections are written to
 */

import wixData from 'wix-data';

// Normalize student email before insert/update
export function Students_beforeInsert(item) {
    if (!item.firstName || !item.lastName) throw new Error('First and last name required.');
    if (!item.parentEmail) throw new Error('Parent email required.');
    item.parentEmail = item.parentEmail.toLowerCase().trim();
    return item;
}

export function Students_beforeUpdate(item) {
    if (item.parentEmail) item.parentEmail = item.parentEmail.toLowerCase().trim();
    return item;
}

// Set defaults on payment insert
export function Payments_beforeInsert(item) {
    item.syncedToMoneyMinder = item.syncedToMoneyMinder ?? false;
    item.paidAt = item.paidAt ?? new Date();
    return item;
}
