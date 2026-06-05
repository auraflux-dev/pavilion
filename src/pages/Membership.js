/**
 * SHMS PTO — Membership Page
 */

import wixLocation from 'wix-location';

// Cheddarup collection URLs — update these once collections are created in Cheddarup
const CHEDDARUP_RUBY    = 'https://app.cheddarup.com/c/shms-pto-ruby-membership';
const CHEDDARUP_SUPREME = 'https://app.cheddarup.com/c/shms-pto-supreme-membership';

$w.onReady(function () {

    // Ruby membership join button
    try {
        $w('#joinRubyBtn').onClick(() => {
            wixLocation.to(CHEDDARUP_RUBY);
        });
    } catch(e) {}

    // Supreme membership join button
    try {
        $w('#joinSupremeBtn').onClick(() => {
            wixLocation.to(CHEDDARUP_SUPREME);
        });
    } catch(e) {}

    // Financial assistance link
    try {
        $w('#financialAssistanceBtn').onClick(() => {
            wixLocation.to('mailto:Lauren.mccreary@lcps.org');
        });
    } catch(e) {}

});
