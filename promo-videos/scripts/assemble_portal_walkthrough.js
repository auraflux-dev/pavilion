#!/usr/bin/env node
'use strict';
/**
 * Assemble SHMS PTO Member Portal walkthrough (stills + BTM VO).
 * NEVER HeyGen / avatar pitch.
 *
 * Prereq VO:
 *   ELEVENLABS_API_KEY=sk_... NODE_PATH=~/cwn-c0/node_modules node scripts/generate_portal_walkthrough_vo.js
 *
 * Assemble:
 *   FFMPEG=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg node scripts/assemble_portal_walkthrough.js
 *
 * Live login stills: see assets/portal-walkthrough/CAPTURE_STATUS.md
 * (free/paid under portal-walkthrough are prior-pack fallbacks until CDP/demo login).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  OUTRO_SEC,
  TEXT_TOP,
  LOGO_W,
  LOGO_X,
  LOGO_Y,
  LOGO_CX,
  LABEL_Y,
  PATHS: STAPLE,
  assertStapleAssets,
} = require('./staple_brand_bookends');

/** Short brand sting, then VO (like staff Cove; not parent-tour 5s cold). */
const COLD_SEC = 1.7;

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const WORK = path.join(OUT_DIR, '_work_portal_wt');
const ASSETS = path.join(ROOT, 'assets/portal-walkthrough');
const SLIDES = path.join(ASSETS, 'slides');
const ff = process.env.FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const fp = process.env.FFPROBE || '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';
const FONT = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((f) => fs.existsSync(f));
const FONT_REG = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/Library/Fonts/Arial.ttf',
  FONT,
].find((f) => f && fs.existsSync(f));

const W = 1920;
const H = 1080;
const FPS = 30;
const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;
const PAD = 0.55;
const TAIL_PAD = 0.7;

const TEXT_X = 280;
const BULLET_X = 310;
const TYPE_EYEBROW = 40;
const TYPE_TITLE = 68;
const TYPE_BULLET = 42;
const TYPE_BRAND = 44;
const TYPE_FOOTER = 36;
const STEP_EYEBROW = 52;
const STEP_TITLE = 82;
const STEP_BULLET = 58;
const WAVE_SAFE_MAX_Y = 680;
const CONTENT_MAX_Y = WAVE_SAFE_MAX_Y;
const FOOTER_Y = LABEL_Y + 120;

/**
 * Prefer first path that exists (relative to ROOT).
 * Generated slides use assets/portal-walkthrough/slides/*.png
 */
function pick(...rels) {
  for (const r of rels) {
    if (fs.existsSync(path.join(ROOT, r))) return r;
  }
  return rels[rels.length - 1];
}

/** Resolve stills after buildSlides() so generated slides can win pick(). */
function resolveBeatStills(beats) {
  for (const b of beats) {
    if (Array.isArray(b.clipPick)) {
      const hit = b.clipPick.find((r) => fs.existsSync(path.join(ROOT, r)));
      if (hit) b.clip = hit;
      delete b.clipPick;
    }
    if (Array.isArray(b.stillsPick)) {
      b.stills = b.stillsPick.map((group) =>
        Array.isArray(group) ? pick(...group) : group
      );
      delete b.stillsPick;
    }
    if (Array.isArray(b.stillsTimedPick)) {
      b.stillsTimed = b.stillsTimedPick.map((item) => ({
        still: Array.isArray(item.stillPick) ? pick(...item.stillPick) : item.still,
        weight: item.weight || 1,
      }));
      delete b.stillsTimedPick;
    }
    if (Array.isArray(b.stillPick)) {
      b.still = pick(...b.stillPick);
      delete b.stillPick;
    }
  }
}

/**
 * Story SEE = HEAR:
 *   SETUP (why care / what's coming) → Cove why → free setup → memberships → paid → shared → Open House
 */
const BEATS = [
  {
    part: 'vo/_parts/portal_wt_p01_setup.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_home_setup.mp4',
    ],
    // Stay on public home — promise the video, don't jump to Cove yet.
    stillPick: [
      'assets/portal-walkthrough/public/home.png',
      'assets/portal-walkthrough/free/portal_home_clean.png',
    ],
    caption: 'Why This Video · What You\'ll Learn',
  },
  {
    part: 'vo/_parts/portal_wt_p02_why_cove.m4a',
    // Public Cove only — portal UI waits until after join/login (p03→p04).
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_cove_card.mp4',
      'assets/portal-walkthrough/scrolls/public_cove_spirit.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/slides/slide_cove_how.png',
          'assets/portal-walkthrough/slides/slide_cove_card.png',
        ],
        weight: 1.2,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/public/cove_spirit_wear.png',
          'assets/portal-walkthrough/fallback/cove_shop.png',
          'assets/portal-walkthrough/slides/slide_cove_card.png',
        ],
        weight: 1,
      },
    ],
    caption: 'Kids Buy Snacks At The Cove',
  },
  {
    part: 'vo/_parts/portal_wt_p03_start_free.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_auth_join.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/public/auth_login.png',
          'assets/portal-walkthrough/fallback/auth_join.png',
        ],
        weight: 1.4,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_01_portal_home.png',
          'assets/portal-walkthrough/free/portal_home_clean.png',
        ],
        weight: 1,
      },
    ],
    caption: 'Start Free · Join Or Log In',
  },
  {
    part: 'vo/_parts/portal_wt_p04_free_home.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/free_portal_home.mp4',
    ],
    stillsTimedPick: [
      { still: 'assets/portal-walkthrough/title_free.png', weight: 0.45 },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_01_portal_home.png',
          'assets/portal-walkthrough/free/portal_home_clean.png',
        ],
        weight: 1.8,
      },
    ],
    caption: 'You\'re In · Member Portal Home',
  },
  {
    part: 'vo/_parts/portal_wt_p05_free_account.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/free_portal_account.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_02_my_account.png',
          'assets/portal-walkthrough/free/portal_home_clean.png',
        ],
        weight: 1.4,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_03_whatsapp.png',
          'assets/portal-walkthrough/free/portal_home_labeled.png',
        ],
        weight: 1,
      },
    ],
    caption: 'My Account · Reminders',
  },
  {
    part: 'vo/_parts/portal_wt_p06_free_students.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/free_portal_students.mp4',
      'assets/portal-walkthrough/scrolls/free_portal_safety.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_04_my_students.png',
          'assets/portal-walkthrough/free/portal_home_clean.png',
        ],
        weight: 1.2,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_05_safety_edit.png',
          'assets/portal-walkthrough/fallback/onboarding_checklist.png',
        ],
        weight: 1.5,
      },
    ],
    caption: 'Add Kids · Safety Unlocks The Card',
  },
  {
    part: 'vo/_parts/portal_wt_p07_free_cove.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/free_portal_cove.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_07_cove_store.png',
          'assets/portal-walkthrough/slides/slide_cove_card.png',
        ],
        weight: 1.6,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_08_reload_modal.png',
          'assets/portal-walkthrough/slides/slide_cove_reload.png',
        ],
        weight: 1.2,
      },
    ],
    caption: 'Cove Digital Card · Snack Window',
  },
  {
    part: 'vo/_parts/portal_wt_p08_memberships.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_memberships.mp4',
    ],
    stillPick: [
      'assets/portal-walkthrough/public/membership_tiers.png',
      'assets/v1-membership-portal/v1-01-membership-tiers.png',
    ],
    caption: 'When You\'re Ready · Memberships',
  },
  {
    part: 'vo/_parts/portal_wt_p09_paid_look.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/paid_portal_home.mp4',
      'assets/portal-walkthrough/scrolls/paid_portal_cove.mp4',
    ],
    stillsTimedPick: [
      { still: 'assets/portal-walkthrough/title_paid.png', weight: 0.45 },
      {
        stillPick: [
          'assets/portal-walkthrough/live/paid_02_my_account.png',
          'assets/portal-walkthrough/live/paid_01_portal_home.png',
        ],
        weight: 1.2,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/paid_04_my_students.png',
          'assets/portal-walkthrough/paid/portal_home_clean.png',
        ],
        weight: 1.1,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/paid_07_cove_store.png',
          'assets/portal-walkthrough/slides/slide_cove_paid_code.png',
        ],
        weight: 1.4,
      },
    ],
    caption: 'Paid Look · Credit · Code Ends In 9',
  },
  {
    part: 'vo/_parts/portal_wt_p10_paid_perks.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/paid_portal_cove.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/slides/slide_cove_paid_code.png',
          'assets/portal-walkthrough/live/paid_07_cove_store.png',
        ],
        weight: 1.3,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/slides/slide_paid_perks.png',
          'assets/portal-walkthrough/public/membership_tiers.png',
        ],
        weight: 1.1,
      },
    ],
    caption: 'Paid · Staff Know Your Code',
  },
  {
    part: 'vo/_parts/portal_wt_p11_shared_tools.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/free_portal_help.mp4',
      'assets/portal-walkthrough/scrolls/free_portal_calendar.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_06_calendar.png',
          'assets/portal-walkthrough/live/paid_06_calendar.png',
        ],
        weight: 1,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_09_help_hub.png',
          'assets/portal-walkthrough/live/paid_09_help_hub.png',
        ],
        weight: 1.4,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/live/free_10_help_article.png',
          'assets/portal-walkthrough/live/paid_10_help_article.png',
        ],
        weight: 0.9,
      },
    ],
    caption: 'Same Either Way · Calendar · Help',
  },
  {
    part: 'vo/_parts/portal_wt_p12_shared_spirit.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_cove_spirit.mp4',
    ],
    stillPick: [
      'assets/portal-walkthrough/public/cove_spirit_wear.png',
      'assets/portal-walkthrough/live/free_11_spirit_wear.png',
      'assets/portal-walkthrough/live/paid_11_spirit_wear.png',
    ],
    caption: 'Spirit Wear · Same Shop',
  },
  {
    part: 'vo/_parts/portal_wt_p13_open_house.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_open_house.mp4',
    ],
    stillsTimedPick: [
      { still: 'assets/portal-walkthrough/public/open_house.png', weight: 1.6 },
      { still: 'assets/portal-walkthrough/public/sips_menu.png', weight: 1.2 },
      {
        stillPick: [
          'assets/portal-walkthrough/public/cove_spirit_wear.png',
          'assets/portal-walkthrough/live/free_11_spirit_wear.png',
        ],
        weight: 1,
      },
    ],
    caption: 'Open House · Cafeteria · Free Truck Ticket',
  },
  {
    part: 'vo/_parts/portal_wt_p14_close.m4a',
    clipPick: [
      'assets/portal-walkthrough/scrolls/public_home_setup.mp4',
      'assets/portal-walkthrough/scrolls/public_open_house.mp4',
    ],
    stillsTimedPick: [
      {
        stillPick: [
          'assets/portal-walkthrough/public/home.png',
          'assets/portal-walkthrough/public/open_house.png',
        ],
        weight: 1.2,
      },
      {
        stillPick: [
          'assets/portal-walkthrough/public/open_house.png',
          'assets/portal-walkthrough/public/home.png',
        ],
        weight: 1,
      },
    ],
    caption: 'Try Today · See You In The Cafeteria',
  },
];

function a(rel) { return path.join(ROOT, rel); }
function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}
function dur(file) {
  return parseFloat(execFileSync(fp, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' }).trim());
}
function run(args) {
  execFileSync(ff, args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

function makeBrandCard(dest, { title, subtitle }) {
  const bg = fs.existsSync(STAPLE.bgSite) ? STAPLE.bgSite : STAPLE.coldOpenDefault;
  const logo = STAPLE.logo;
  const font = FONT.replace(/:/g, '\\:');
  const t = esc(title);
  const s = esc(subtitle);
  const fc = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]`,
    `[1:v]scale=${LOGO_W}:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=${LOGO_X}:y=${LOGO_Y}[v1]`,
    `[v1]drawtext=fontfile=${font}:text='${t}':fontsize=72:fontcolor=white:x=90:y=${TEXT_TOP},` +
      `drawtext=fontfile=${font}:text='${s}':fontsize=40:fontcolor=0x98C818:x=90:y=${TEXT_TOP + 100},` +
      `drawtext=fontfile=${font}:text='SHMS PTO':fontsize=44:fontcolor=0x98C818:x=${LOGO_CX}-text_w/2:y=${LABEL_Y}`,
  ].join(';');
  run(['-y', '-i', bg, '-i', logo, '-filter_complex', fc, '-frames:v', '1', '-update', '1', dest]);
}

function makeSlide(outName, { eyebrow, title, bullets = [], footer }) {
  const out = path.join(SLIDES, outName);
  const bg = a('assets/parent-tour/thumbs/bg_site_only.png');
  const logo = a('assets/parent-tour/ch3/06_logo.png');
  const src = fs.existsSync(bg) ? bg : a('assets/v2-team-volunteer/v2-01-board.png');
  const fontB = FONT.replace(/:/g, '\\:');
  const fontR = FONT_REG.replace(/:/g, '\\:');

  const parts = [
    `[0:v]${VF}[bg]`,
    `[1:v]scale=${LOGO_W}:-1,format=rgba[lg]`,
    `[bg][lg]overlay=x=${LOGO_X}:y=${LOGO_Y}[v0]`,
  ];
  let last = 'v0';
  let n = 1;
  const addText = (text, { size, color, x, y, bold = true }) => {
    const tag = `v${n++}`;
    const f = bold ? fontB : fontR;
    parts.push(
      `[${last}]drawtext=fontfile=${f}:text='${esc(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}[${tag}]`
    );
    last = tag;
  };

  addText('SHMS PTO', {
    size: TYPE_BRAND,
    color: '0x98C818',
    x: `${LOGO_CX}-text_w/2`,
    y: LABEL_Y,
  });

  let y = TEXT_TOP;
  if (eyebrow) {
    addText(eyebrow, { size: TYPE_EYEBROW, color: '0x98C818', x: TEXT_X, y });
    y += STEP_EYEBROW;
  }
  addText(title, { size: TYPE_TITLE, color: 'white', x: TEXT_X, y });
  y += STEP_TITLE;
  for (const b of bullets) {
    if (y + TYPE_BULLET > CONTENT_MAX_Y) break;
    addText(`•  ${b}`, { size: TYPE_BULLET, color: 'white', x: BULLET_X, y, bold: false });
    y += STEP_BULLET;
  }
  if (footer) {
    const tag = `v${n++}`;
    parts.push(
      `[${last}]drawtext=fontfile=${fontB}:text='${esc(footer)}':fontsize=${TYPE_FOOTER}:fontcolor=white:` +
      `borderw=3:bordercolor=black@0.8:x=${LOGO_CX}-text_w/2:y=${FOOTER_Y}[${tag}]`
    );
    last = tag;
  }

  run([
    '-y', '-i', src, '-i', logo,
    '-filter_complex', parts.join(';'),
    '-map', `[${last}]`,
    '-frames:v', '1', '-update', '1',
    out,
  ]);
  return out;
}

function buildSlides() {
  fs.mkdirSync(SLIDES, { recursive: true });
  makeSlide('slide_lanes.png', {
    eyebrow: 'This Video',
    title: 'Two Lanes + Help',
    bullets: [
      'Free parent account',
      'Paid PTO membership',
      'Member Help docs',
      'Open House Thursday',
    ],
    footer: 'Same Portal Tools · Different Perks',
  });
  makeSlide('slide_my_account.png', {
    eyebrow: 'After Sign In',
    title: 'My Account',
    bullets: [
      'Free or paid status',
      'Edit profile',
      'Snack window vs online reload',
      'Grade WhatsApp · tap Join',
    ],
    footer: 'Live Account Screen Needs Login Capture',
  });
  makeSlide('slide_my_students.png', {
    eyebrow: 'Family Setup',
    title: 'My Students',
    bullets: [
      'Add every child',
      'First name · last name · grade',
      'Then open safety profile',
    ],
    footer: 'Required Before Cove Card',
  });
  makeSlide('slide_safety.png', {
    eyebrow: 'Safety Profile',
    title: 'Unlocks Cove Card',
    bullets: [
      'Parent phone',
      'Emergency contact',
      'Authorized pick-up list',
      'Paid · tier badge on student card',
    ],
    footer: 'Incomplete = Card Stays Locked',
  });
  makeSlide('slide_calendar.png', {
    eyebrow: 'Portal',
    title: 'Calendar + Messages',
    bullets: [
      'Used after enrichment enroll',
      'Empty at first is normal',
      'Check back when programs open',
    ],
    footer: 'Not Broken · Just Early',
  });
  makeSlide('slide_help_docs.png', {
    eyebrow: 'Member Help',
    title: 'Knowledge Base',
    bullets: [
      'Account and login',
      'Students · Membership',
      'Store and Cove Digital Card',
      'Programs · surveys · Ask the PTO',
    ],
    footer: 'Tap An Article · Or Ask The PTO',
  });
  makeSlide('slide_paid_perks.png', {
    eyebrow: 'Paid Only',
    title: 'Year-Long Perks',
    bullets: [
      'Event refreshments · Lagoon + Tide',
      'Enrichment discounts all year',
      'Priority enrichment registration',
      'Open House · code ending in 9',
    ],
    footer: 'Show Ends-In-9 Code At The Truck',
  });
  makeSlide('slide_banners.png', {
    eyebrow: 'Watch The Banner',
    title: 'Free Or Paid Status',
    bullets: [
      'Free parent account',
      'or Paid PTO membership active',
      'Paid adds card credit + perks',
      'Reef · Lagoon · Tide',
    ],
    footer: 'Same Portal Tools · Different Banner',
  });
  makeSlide('slide_cove_card.png', {
    eyebrow: 'Store',
    title: 'Cove Digital Card',
    bullets: [
      'Family balance',
      'Recent purchases',
      'QR at The Cove window',
      'Six-digit backup code',
    ],
    footer: 'No Cash Needed At The Window',
  });
  makeSlide('slide_cove_how.png', {
    eyebrow: 'How',
    title: 'QR Or Backup Code',
    bullets: [
      'Show the QR at The Cove window',
      'Or say the six-digit backup code',
      'Reload online anytime',
      'Card or PayPal',
    ],
    footer: 'Same Card · Free Or Paid',
  });
  makeSlide('slide_cove_reload.png', {
    eyebrow: 'Cove Card',
    title: 'Load + Codes',
    bullets: [
      'Free · load your own money',
      'Paid · membership credit first',
      'Then reload more anytime',
      'Paid Family Cove codes end in 9',
    ],
    footer: 'Card Or PayPal Online',
  });
  // Explicit paid example so VO "ends in 9" matches the picture (Gemini minor).
  makeSlide('slide_cove_paid_code.png', {
    eyebrow: 'Paid',
    title: 'Codes End In 9',
    bullets: [
      'Free · load your own money',
      'Paid · membership credit first',
      'Then reload dollar for dollar',
      'Paid example · · · · · 9',
    ],
    footer: 'Staff Recognize Paid By The Final Digit',
  });
}

function stillHold(img, outMp4, seconds) {
  run([
    '-y', '-loop', '1', '-i', img,
    '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
    '-vf', VF,
    '-t', String(seconds),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-shortest',
    outMp4,
  ]);
}

/** Hard-cut montage of multiple stills timed to one VO part (SEE=HEAR lane swaps). */
function montageHold(imgs, outMp4, totalSec, weights) {
  if (!imgs.length) throw new Error('montageHold: no images');
  if (imgs.length === 1) {
    stillHold(imgs[0], outMp4, totalSec);
    return;
  }
  const w = (weights && weights.length === imgs.length)
    ? weights.map((x) => Math.max(0.1, Number(x) || 1))
    : imgs.map(() => 1);
  const sum = w.reduce((a, b) => a + b, 0);
  let allocated = 0;
  const clips = [];
  imgs.forEach((img, i) => {
    const hold = i === imgs.length - 1
      ? Math.max(0.5, totalSec - allocated)
      : Math.max(0.8, (totalSec * w[i]) / sum);
    allocated += hold;
    const c = path.join(WORK, `mont_${path.basename(outMp4, '.mp4')}_${i}.mp4`);
    stillHold(img, c, hold);
    clips.push(c);
  });
  const list = path.join(WORK, `mont_${path.basename(outMp4, '.mp4')}_concat.txt`);
  fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outMp4]);
}

/** Fit a scroll clip to VO length.
 *  Prefer VO-synced captures (natural speed). Only tiny stretch if slightly short;
 *  otherwise hold the last frame so motion stays readable. */
function continuousFit(src, dest, targetSec) {
  const srcLen = Math.max(0.4, dur(src));
  const ratio = targetSec / srcLen;
  const MAX_STRETCH = 1.12;

  if (ratio <= 1.02) {
    run([
      '-y', '-i', src, '-t', String(targetSec),
      '-vf', VF, '-an',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      dest,
    ]);
    return;
  }

  if (ratio <= MAX_STRETCH) {
    const setpts = `setpts=${ratio.toFixed(6)}*PTS`;
    run([
      '-y', '-i', src,
      '-vf', `${VF},${setpts}`,
      '-an', '-t', String(targetSec),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
      dest,
    ]);
    return;
  }

  // Clip too short: play natural speed, freeze last frame for remainder.
  const raw = dest.replace(/\.mp4$/, '_raw.mp4');
  const last = dest.replace(/\.mp4$/, '_last.png');
  const hold = dest.replace(/\.mp4$/, '_hold.mp4');
  run([
    '-y', '-i', src,
    '-vf', VF, '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
    raw,
  ]);
  run(['-y', '-sseof', '-0.05', '-i', raw, '-frames:v', '1', last]);
  stillHold(last, hold, targetSec - srcLen + 0.1);
  const list = dest.replace(/\.mp4$/, '_concat.txt');
  fs.writeFileSync(list, [`file '${raw}'`, `file '${hold}'`].join('\n'));
  const merged = dest.replace(/\.mp4$/, '_mrg.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', merged]);
  run([
    '-y', '-i', merged, '-t', String(targetSec),
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-an',
    dest,
  ]);
}

function tsFmt(x) {
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = Math.floor(x % 60);
  const ms = Math.floor((x % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function musicBed(srcMusic, outAac, seconds, { fadeOut = true, startAt = 0 } = {}) {
  const fade = fadeOut
    ? `,afade=t=out:st=${Math.max(0, seconds - 1.2)}:d=1.2`
    : '';
  run([
    '-y', '-ss', String(startAt), '-i', srcMusic, '-t', String(seconds),
    '-af', `volume=-20dB,afade=t=in:st=0:d=0.6${fade}`,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', outAac,
  ]);
}

function muxSilentStill(img, audio, dest, seconds) {
  run([
    '-y', '-loop', '1', '-i', img, '-i', audio,
    '-vf', VF, '-t', String(seconds),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-shortest',
    dest,
  ]);
}

function main() {
  if (!FONT) throw new Error('Arial Bold font missing');
  if (!fs.existsSync(ff)) {
    throw new Error(`ffmpeg not found at ${ff}. Set FFMPEG=...`);
  }
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(ASSETS, { recursive: true });

  const coldImg = path.join(ASSETS, 'cold_open.png');
  const outroImg = path.join(ASSETS, 'outro.png');
  makeBrandCard(coldImg, {
    title: 'MEMBER PORTAL',
    subtitle: 'Why · What · How · For Families',
  });
  makeBrandCard(outroImg, {
    title: 'THANK YOU',
    subtitle: 'Go Stingrays!',
  });
  assertStapleAssets(coldImg, outroImg);

  console.log('Building slides…');
  buildSlides();
  resolveBeatStills(BEATS);

  const music = a('assets/music/es_go_adelyn_paik_instrumental.mp3');
  if (!fs.existsSync(music)) throw new Error('Missing music bed');

  for (const b of BEATS) {
    if (!fs.existsSync(a(b.part))) {
      throw new Error(
        `Missing VO ${b.part}\nRun:\n  ELEVENLABS_API_KEY=sk_... NODE_PATH=~/cwn-c0/node_modules node scripts/generate_portal_walkthrough_vo.js`
      );
    }
    if (b.clip && fs.existsSync(a(b.clip))) continue;
    const imgs = Array.isArray(b.stillsTimed)
      ? b.stillsTimed.map((x) => x.still)
      : (Array.isArray(b.stills) ? b.stills : [b.still]);
    for (const rel of imgs) {
      if (!rel) continue;
      if (!fs.existsSync(a(rel))) {
        throw new Error(`Missing still ${rel}`);
      }
    }
  }

  // Cold open: brand card (logo bookend). Optional alt: public/home.png behind brand —
  // keep staple brand card for consistency with staff Cove.
  const coldA = path.join(WORK, 'cold_a.m4a');
  const coldClip = path.join(WORK, '00_cold.mp4');
  musicBed(music, coldA, COLD_SEC, { fadeOut: false });
  muxSilentStill(coldImg, coldA, coldClip, COLD_SEC);

  const bodyClips = [];
  const srt = [];
  let t = COLD_SEC;
  srt.push(`1\n${tsFmt(0)} --> ${tsFmt(COLD_SEC - 0.05)}\nMember Portal Walkthrough · Families\n`);

  const gaps = [];
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    const vo = a(b.part);
    let imgs;
    let weights;
    const isLast = i === BEATS.length - 1;
    const d = dur(vo) + PAD + (isLast ? TAIL_PAD : 0);
    const clip = path.join(WORK, `beat_${String(i).padStart(2, '0')}.mp4`);
    if (b.clip && fs.existsSync(a(b.clip))) {
      continuousFit(a(b.clip), clip, d);
    } else if (Array.isArray(b.stillsTimed)) {
      imgs = b.stillsTimed.map((x) => a(x.still));
      weights = b.stillsTimed.map((x) => x.weight || 1);
      montageHold(imgs, clip, d, weights);
    } else {
      imgs = (Array.isArray(b.stills) ? b.stills : [b.still]).map((rel) => a(rel));
      weights = null;
      montageHold(imgs, clip, d, weights);
    }
    const muxed = path.join(WORK, `beat_${String(i).padStart(2, '0')}_m.mp4`);
    const padDur = PAD + (isLast ? TAIL_PAD : 0);
    run([
      '-y', '-i', clip, '-i', vo,
      '-filter_complex', `[1:a]apad=pad_dur=${padDur}[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-t', String(d),
      muxed,
    ]);
    bodyClips.push(muxed);
    const start = t;
    t += d;
    srt.push(`${i + 2}\n${tsFmt(start)} --> ${tsFmt(start + dur(vo))}\n${b.caption}\n`);
    const stillLabel = b.clip
      ? b.clip
      : (Array.isArray(b.stillsTimed)
        ? b.stillsTimed.map((x) => x.still).join(' → ')
        : (Array.isArray(b.stills) ? b.stills.join(' → ') : b.still));
    if (!b.clip && (String(stillLabel).includes('/slides/') || String(stillLabel).includes('title_'))) {
      gaps.push(`p${String(i + 1).padStart(2, '0')}: ${b.caption} → ${stillLabel}`);
    }
    if (b.clip) {
      console.log(`  clip p${String(i + 1).padStart(2, '0')}: ${b.caption} ← ${b.clip}`);
    }
  }

  const outroA = path.join(WORK, 'outro_a.m4a');
  const outroClip = path.join(WORK, '99_outro.mp4');
  musicBed(music, outroA, OUTRO_SEC, { fadeOut: true, startAt: 28 });
  muxSilentStill(outroImg, outroA, outroClip, OUTRO_SEC);
  srt.push(`${BEATS.length + 2}\n${tsFmt(t)} --> ${tsFmt(t + OUTRO_SEC - 0.05)}\nThank You · Go Stingrays · SHMS PTO\n`);

  const list = path.join(WORK, 'concat.txt');
  const all = [coldClip, ...bodyClips, outroClip];
  fs.writeFileSync(list, all.map((c) => `file '${c}'`).join('\n'));
  const joined = path.join(WORK, 'joined.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

  const out = path.join(OUT_DIR, 'SHMSPTO_member_portal_walkthrough_16x9.mp4');
  const watch = path.join(os.homedir(), 'Downloads', 'SHMSPTO_WATCH_THIS_member_portal_16x9.mp4');
  run([
    '-y', '-i', joined, '-stream_loop', '-1', '-i', music,
    '-filter_complex',
    `[1:a]volume=0.08,afade=t=in:st=0:d=0.5[a1];` +
      `[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.35[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-movflags', '+faststart',
    out,
  ]);

  fs.copyFileSync(out, watch);
  fs.writeFileSync(path.join(OUT_DIR, 'SHMSPTO_member_portal_walkthrough_captions.srt'), srt.join('\n'));

  console.log('DONE', out);
  console.log('Watch file:', watch);
  console.log('duration', dur(out).toFixed(1) + 's');
  console.log('BEATS', BEATS.length);
  console.log('Title/slide beats (no live portal UI):');
  gaps.forEach((g) => console.log(' ', g));
  console.log('CAPTURE_STATUS: live free/paid login still missing — re-capture when CDP or demo creds available.');
}

if (require.main === module) {
  main();
}
