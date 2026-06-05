/**
 * SHMS PTO — Stone Hill Middle School PTO
 * File: masterPage.js — runs on every page
 *
 * Handles: announcement bar, navigation, member welcome, footer newsletter
 */

import { session } from 'wix-storage';
import wixLocation from 'wix-location';
import { formFactor } from 'wix-window';
import wixData from 'wix-data';
import { currentMember } from 'wix-members';

$w.onReady(function () {

    // ── ANNOUNCEMENT BAR ──────────────────────────────────────────────────────
    session.getItem('announcementBarDismissed').then((dismissed) => {
        if (dismissed === 'true') {
            try { $w('#announcementBar').collapse(); } catch(e) {}
        } else {
            try { $w('#announcementBar').expand(); } catch(e) {}
        }
    });

    try {
        $w('#announcementDismiss').onClick(() => {
            $w('#announcementBar').collapse();
            session.setItem('announcementBarDismissed', 'true');
        });
    } catch(e) {}

    // ── NAVIGATION ────────────────────────────────────────────────────────────
    const navLinks = [
        { id: '#navHome',       path: '/' },
        { id: '#navAbout',      path: '/about' },
        { id: '#navPrograms',   path: '/programs' },
        { id: '#navEvents',     path: '/events' },
        { id: '#navStore',      path: '/store' },
        { id: '#navVolunteer',  path: '/volunteer' },
        { id: '#navMembership', path: '/membership' },
        { id: '#navContact',    path: '/contact' }
    ];

    const currentPath = '/' + wixLocation.path.join('/');

    navLinks.forEach(({ id, path }) => {
        try {
            const el = $w(id);
            el.style.color = currentPath === path ? '#085508' : '#000000';
            el.onMouseIn(() => { el.style.color = '#8B1A1A'; });
            el.onMouseOut(() => { el.style.color = currentPath === path ? '#085508' : '#000000'; });
        } catch(e) {}
    });

    try { $w('#logoText').onClick(() => wixLocation.to('/')); } catch(e) {}
    try { $w('#memberPortal').onClick(() => wixLocation.to('/member-portal')); } catch(e) {}

    // Mobile hamburger
    try {
        $w('#hamburgerIcon').onClick(() => $w('#mobileMenu').expand());
        $w('#mobileMenu').onMouseOut(() => $w('#mobileMenu').collapse());
    } catch(e) {}

    formFactor().then((ff) => {
        if (ff === 'Mobile') {
            try { $w('#navMenu').collapse(); } catch(e) {}
            try { $w('#hamburgerIcon').show(); } catch(e) {}
        } else {
            try { $w('#navMenu').expand(); } catch(e) {}
            try { $w('#hamburgerIcon').hide(); } catch(e) {}
            try { $w('#mobileMenu').collapse(); } catch(e) {}
        }
    });

    // ── MEMBER WELCOME ────────────────────────────────────────────────────────
    currentMember.getMember()
        .then((member) => {
            if (member) {
                try {
                    const name = member.contactDetails?.firstName || 'Member';
                    $w('#memberWelcome').text = `Welcome back, ${name}!`;
                    $w('#memberWelcome').show();
                } catch(e) {}
            }
        })
        .catch(() => {});

    // ── FOOTER NEWSLETTER ─────────────────────────────────────────────────────
    try {
        $w('#subscribeBtn').onClick(async () => {
            const email = ($w('#newsletterEmail').value || '').trim().toLowerCase();
            if (!email || !email.includes('@')) {
                $w('#subscribeSuccess').text = 'Please enter a valid email address.';
                $w('#subscribeSuccess').show();
                return;
            }
            try {
                await wixData.insert('NewsletterSubscribers', {
                    email,
                    subscribedAt: new Date(),
                    active: true
                });
                $w('#newsletterEmail').value = '';
                $w('#subscribeSuccess').text = "You're subscribed! Go Stingrays! 🐟";
                $w('#subscribeSuccess').show();
            } catch(e) {
                $w('#subscribeSuccess').text = 'Something went wrong. Please try again.';
                $w('#subscribeSuccess').show();
            }
        });
    } catch(e) {}

});
