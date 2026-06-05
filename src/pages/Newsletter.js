/**
 * SHMS PTO — Newsletter Page
 */

import wixData from 'wix-data';

$w.onReady(function () {

    // Newsletter subscribe form
    try {
        $w('#newsletterSubmitBtn').onClick(async () => {
            const firstName = ($w('#newsletterFirstName').value || '').trim();
            const lastName  = ($w('#newsletterLastName').value  || '').trim();
            const email     = ($w('#newsletterEmailInput').value || '').trim().toLowerCase();

            if (!email || !email.includes('@')) {
                $w('#newsletterError').text = 'Please enter a valid email address.';
                $w('#newsletterError').show();
                return;
            }

            try {
                // Check for duplicate
                const existing = await wixData.query('NewsletterSubscribers')
                    .eq('email', email)
                    .find();

                if (existing.items.length > 0) {
                    $w('#newsletterError').text = 'You are already subscribed!';
                    $w('#newsletterError').show();
                    return;
                }

                await wixData.insert('NewsletterSubscribers', {
                    email, firstName, lastName,
                    subscribedAt: new Date(),
                    active: true
                });
                $w('#newsletterForm').collapse();
                $w('#newsletterSuccess').show();
            } catch(e) {
                $w('#newsletterError').text = 'Something went wrong. Please try again.';
                $w('#newsletterError').show();
            }
        });
    } catch(e) {}

});
