/**
 * SHMS PTO — Volunteer Page
 */

import wixData from 'wix-data';

const OPPORTUNITIES = [
    'School Store (Mon-Fri 8:15-9:00am)',
    'Event Setup & Breakdown',
    'Fundraiser Support',
    'Dance Night Chaperone',
    'Classroom Help',
    'NOVA Math Tournament',
    'Spirit Wear Sales'
];

$w.onReady(function () {

    // Populate opportunities list
    try {
        $w('#opportunitiesRepeater').data = OPPORTUNITIES.map((o, i) => ({ _id: String(i), opportunity: o }));
        $w('#opportunitiesRepeater').onItemReady(($item, itemData) => {
            try { $item('#opportunityText').text = itemData.opportunity; } catch(e) {}
        });
    } catch(e) {}

    // Volunteer form submit
    try {
        $w('#volunteerSubmitBtn').onClick(async () => {
            const firstName  = ($w('#volunteerFirstName').value  || '').trim();
            const lastName   = ($w('#volunteerLastName').value   || '').trim();
            const email      = ($w('#volunteerEmail').value      || '').trim().toLowerCase();
            const phone      = ($w('#volunteerPhone').value      || '').trim();
            const opportunity = $w('#volunteerOpportunity').value || '';

            if (!firstName || !lastName || !email) {
                $w('#volunteerError').text = 'Please fill in your name and email.';
                $w('#volunteerError').show();
                return;
            }

            try {
                await wixData.insert('Volunteers', {
                    firstName, lastName, email, phone, opportunity,
                    status: 'pending',
                    submittedAt: new Date()
                });
                $w('#volunteerForm').collapse();
                $w('#volunteerSuccess').show();
            } catch(e) {
                $w('#volunteerError').text = 'Something went wrong. Please try again.';
                $w('#volunteerError').show();
            }
        });
    } catch(e) {}

});
