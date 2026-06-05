/**
 * SHMS PTO — Enrichment Programs Page
 */

import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async function () {

    // Load programs from CMS
    try {
        const res = await wixData.query('Programs')
            .ascending('name')
            .find();

        if (res.items.length > 0) {
            $w('#programsRepeater').data = res.items;
            $w('#programsRepeater').onItemReady(($item, itemData) => {
                try { $item('#programName').text = itemData.name; } catch(e) {}
                try { $item('#programFee').text = itemData.fee ? `$${itemData.fee}` : 'Free'; } catch(e) {}
                try { $item('#programGrades').text = itemData.grades || 'Grades 6-8'; } catch(e) {}
                try {
                    $item('#programDescription').text = itemData.description || '';
                } catch(e) {}
                try {
                    $item('#registerBtn').onClick(() => {
                        if (itemData.cheddarupUrl) {
                            wixLocation.to(itemData.cheddarupUrl);
                        } else {
                            wixLocation.to('/pay');
                        }
                    });
                } catch(e) {}
                try {
                    if (!itemData.registrationOpen) {
                        $item('#registerBtn').disable();
                        $item('#registerBtn').label = 'Registration Closed';
                    }
                } catch(e) {}
            });
        } else {
            // No programs in CMS yet — show placeholder message
            try { $w('#noProgramsMsg').show(); } catch(e) {}
        }
    } catch(e) {
        console.error('Programs load error:', e);
    }

});
