/**
 * SHMS PTO — Home Page
 * File: Home.c1dmp.js
 */

import wixLocation from 'wix-location';
import { currentMember } from 'wix-members';
import wixData from 'wix-data';

$w.onReady(async function () {

    // ── HERO BUTTONS ──────────────────────────────────────────────────────────
    try { $w('#joinBtn').onClick(() => wixLocation.to('/membership')); } catch(e) {}
    try { $w('#programsBtn').onClick(() => wixLocation.to('/programs')); } catch(e) {}
    try { $w('#volunteerBtn').onClick(() => wixLocation.to('/volunteer')); } catch(e) {}
    try { $w('#storeBtn').onClick(() => wixLocation.to('/store')); } catch(e) {}

    // ── MEMBER WELCOME ON HERO ────────────────────────────────────────────────
    try {
        const member = await currentMember.getMember();
        if (member) {
            const name = member.contactDetails?.firstName || 'Member';
            $w('#memberWelcome').text = `Welcome back, ${name}!`;
            $w('#memberWelcome').show();
        }
    } catch(e) {}

    // ── LOAD UPCOMING PROGRAMS PREVIEW ────────────────────────────────────────
    try {
        const res = await wixData.query('Programs')
            .eq('registrationOpen', true)
            .limit(3)
            .find();

        if (res.items.length > 0) {
            $w('#programsRepeater').data = res.items.map(p => ({
                _id: p._id,
                name: p.name,
                fee: `$${p.fee}`,
                grades: p.grades || 'All grades'
            }));

            $w('#programsRepeater').onItemReady(($item, itemData) => {
                try { $item('#programName').text = itemData.name; } catch(e) {}
                try { $item('#programFee').text = itemData.fee; } catch(e) {}
                try { $item('#programGrades').text = itemData.grades; } catch(e) {}
                try {
                    $item('#programRegisterBtn').onClick(() => {
                        wixLocation.to('/programs');
                    });
                } catch(e) {}
            });
        }
    } catch(e) {}

});
