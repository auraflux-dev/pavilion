/**
 * SHMS PTO — Initiatives Page
 */

import wixLocation from 'wix-location';

$w.onReady(function () {

    // Harris Teeter VIC card link
    try {
        $w('#harrisTeeteerBtn').onClick(() => {
            wixLocation.to('https://www.harristeeter.com/vic');
        });
    } catch(e) {}

    // NOVA Math registration
    try {
        $w('#novaMathBtn').onClick(() => {
            wixLocation.to('/programs');
        });
    } catch(e) {}

    // Enrichment programs link
    try {
        $w('#enrichmentBtn').onClick(() => {
            wixLocation.to('/programs');
        });
    } catch(e) {}

});
