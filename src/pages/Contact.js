/**
 * SHMS PTO — Contact Page
 */

import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(function () {

    // Contact form submit
    try {
        $w('#contactSubmitBtn').onClick(async () => {
            const firstName = ($w('#contactFirstName').value || '').trim();
            const lastName  = ($w('#contactLastName').value  || '').trim();
            const email     = ($w('#contactEmail').value     || '').trim().toLowerCase();
            const subject   = ($w('#contactSubject').value   || '').trim();
            const message   = ($w('#contactMessage').value   || '').trim();

            if (!firstName || !email || !message) {
                $w('#contactError').text = 'Please fill in your name, email, and message.';
                $w('#contactError').show();
                return;
            }

            // Store in Volunteers collection as a contact inquiry
            try {
                await wixData.insert('Volunteers', {
                    firstName, lastName, email,
                    opportunity: `Contact Form: ${subject}`,
                    notes: message,
                    status: 'inquiry',
                    submittedAt: new Date()
                });
                $w('#contactForm').collapse();
                $w('#contactSuccess').show();
            } catch(e) {
                $w('#contactError').text = 'Something went wrong. Please try again.';
                $w('#contactError').show();
            }
        });
    } catch(e) {}

    // Social links
    try {
        $w('#facebookLink').onClick(() => {
            wixLocation.to('https://www.facebook.com/shmspto');
        });
    } catch(e) {}

    try {
        $w('#twitterLink').onClick(() => {
            wixLocation.to('https://www.twitter.com/shmspto');
        });
    } catch(e) {}

});
