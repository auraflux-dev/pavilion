/**
 * SHMS PTO — Member Portal Page (gated)
 * Shows student store card balances and enrollment history
 */

import wixData from 'wix-data';
import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';

$w.onReady(async function () {

    // Redirect to login if not a member
    try {
        const member = await currentMember.getMember();
        if (!member) {
            wixLocation.to('/login?redirect=/member-portal');
            return;
        }

        const email = member.loginEmail?.toLowerCase();

        // Load student store cards
        const studentsRes = await wixData.query('Students')
            .eq('parentEmail', email)
            .find({ suppressAuth: true });

        if (studentsRes.items.length > 0) {
            $w('#studentsRepeater').data = studentsRes.items;
            $w('#studentsRepeater').onItemReady(($item, itemData) => {
                try {
                    $item('#studentName').text = `${itemData.firstName} ${itemData.lastName}`;
                } catch(e) {}
                try {
                    $item('#studentGrade').text = `Grade ${itemData.grade}`;
                } catch(e) {}
                try {
                    $item('#cardBalance').text = `$${(itemData.storeCardBalance || 0).toFixed(2)}`;
                } catch(e) {}
                try {
                    $item('#membershipTier').text = itemData.membershipTier || 'Not a member';
                } catch(e) {}
            });
        } else {
            try { $w('#noStudentsMsg').show(); } catch(e) {}
        }

        // Load enrollment history
        const enrollmentsRes = await wixData.query('Enrollments')
            .eq('parentEmail', email)
            .descending('paidAt')
            .limit(10)
            .find({ suppressAuth: true });

        if (enrollmentsRes.items.length > 0) {
            $w('#enrollmentsRepeater').data = enrollmentsRes.items;
            $w('#enrollmentsRepeater').onItemReady(($item, itemData) => {
                try { $item('#enrollProgramName').text = itemData.programName; } catch(e) {}
                try { $item('#enrollStudentName').text = itemData.studentName; } catch(e) {}
                try { $item('#enrollStatus').text = itemData.status; } catch(e) {}
                try {
                    $item('#enrollAmount').text = `$${(itemData.paidAmount || 0).toFixed(2)}`;
                } catch(e) {}
            });
        } else {
            try { $w('#noEnrollmentsMsg').show(); } catch(e) {}
        }

    } catch(e) {
        console.error('Member portal error:', e);
        wixLocation.to('/login?redirect=/member-portal');
    }

});
