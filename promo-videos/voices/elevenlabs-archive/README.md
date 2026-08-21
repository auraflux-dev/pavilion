# ElevenLabs cancel archive

Local copies of voice previews and finished VO takes so HSKRG can cancel ElevenLabs
without losing samples for future local TTS or mic re-record scripts.

Also mirrored to `~/hskrg-voice-archive/` (outside the git repo).

Audio files are gitignored. This README is the inventory.

## Safe to cancel when
- [x] Previews archived (Bobby G CWN clone, Behind the Mask, older PTO previews)
- [x] Finished parent-tour takes archived under `finished-takes/`
- [ ] Optional: export any other ElevenLabs library voices you still need as sample WAVs from the dashboard
- [ ] Cancel ElevenLabs / stop CWN credit burn for school promos

## Note
These files are samples and finished takes. They do not replace the hosted `voice_id`.
New lines after cancel = local TTS from samples, or mic record from a script.

## Files

### previews/

- `voice_preview_behind_the_mask.mp3` (496580 bytes, sha256 834f51b178d25722)
- `voice_preview_better_pto.mp3` (509746 bytes, sha256 e17ed0e9fb7462d5)
- `voice_preview_bobby_g_cwn_clone.mp3` (288436 bytes, sha256 a5c1eee095b52dd4)
- `voice_preview_pto_videos.mp3` (630745 bytes, sha256 eda091c6f0d661b3)

### finished-takes/

- `ch01_website.m4a` (809282 bytes, sha256 09f9d8cf652077f1)
- `ch02_membership.m4a` (1532920 bytes, sha256 13d069148394b912)
- `ch03_cove_card.m4a` (997203 bytes, sha256 e8e2392c91b017cd)
- `parent_tour_full.m4a` (3337835 bytes, sha256 1aa60a348bd1b89a)
- `parent_tour_full_oneshot.m4a` (3518837 bytes, sha256 cc90fed2355c30d4)
- `parent_tour_vo_music.m4a` (3366756 bytes, sha256 8c9939e7ffa94ebd)
- `parent_tour_vo_paced.m4a` (4801153 bytes, sha256 b08638a6b2ae0bc9)

