/**
 * SHMS PTO — About / PTO Board Page
 */

import wixData from 'wix-data';

const BOARD_MEMBERS = [
    { name: 'Shweta Walia',        role: 'President',              email: 'president@shmspto.org' },
    { name: 'Ayantika Mukherjee',  role: 'Secretary',              email: 'secretary@shmspto.org' },
    { name: 'Robert Gregory',      role: 'Treasurer',              email: 'treasurer@shmspto.org' },
    { name: 'Sarath Kolla',        role: 'VP Fundraising',         email: 'vp-fundraising@shmspto.org' },
    { name: 'Kirsten Benavides',   role: 'VP Events',              email: 'vp-events@shmspto.org' },
    { name: 'Bayan Souqi',         role: 'VP Staff Appreciation',  email: '' },
    { name: 'Nitin Golait',        role: 'VP Sponsorships',        email: 'vp-sponsorships@shmspto.org' },
    { name: 'Kelly Farver',        role: 'VP Initiatives',         email: 'vp-initiatives@shmspto.org' },
    { name: 'Nilakshi Deshpande',  role: 'Co-VP Initiatives',      email: '' },
    { name: 'Nupur Singh',         role: 'Co-VP Initiatives',      email: '' },
    { name: 'Pankaj Sharma',       role: 'VP Tech & Social Media', email: 'techsupport@shmspto.org' },
    { name: 'Beth Carlson',        role: 'SEAC Representative',    email: 'seac@shmspto.org' },
    { name: 'Pankaj Sharma',       role: 'LEAF Representative',    email: 'leaf@shmspto.org' },
    { name: 'Grace Huang',         role: 'Spirit Wear Coordinator',email: 'spiritwear@shmspto.org' },
    { name: 'Grace Huang',         role: 'Store Coordinator',      email: 'store@shmspto.org' }
];

const OPEN_POSITIONS = [
    'President', 'Secretary', 'VP Sponsorships', 'Co-VP Initiatives',
    'VP Social Media', 'Co-VP Community Events', 'Co-VP Staff Appreciation',
    'LEAF Representative', 'MSAAC Representative', 'SEAC Representative'
];

$w.onReady(function () {

    // Populate board members repeater
    try {
        $w('#boardRepeater').data = BOARD_MEMBERS.map((m, i) => ({ ...m, _id: String(i) }));
        $w('#boardRepeater').onItemReady(($item, itemData) => {
            try { $item('#boardName').text = itemData.name; } catch(e) {}
            try { $item('#boardRole').text = itemData.role; } catch(e) {}
            try {
                if (itemData.email) {
                    $item('#boardEmail').text = itemData.email;
                    $item('#boardEmail').show();
                } else {
                    $item('#boardEmail').hide();
                }
            } catch(e) {}
        });
    } catch(e) {}

    // Populate open positions repeater
    try {
        $w('#openPositionsRepeater').data = OPEN_POSITIONS.map((p, i) => ({ _id: String(i), position: p }));
        $w('#openPositionsRepeater').onItemReady(($item, itemData) => {
            try { $item('#positionName').text = itemData.position; } catch(e) {}
        });
    } catch(e) {}

});
