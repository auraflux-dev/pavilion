# SHMS PTO platform
- Hybrid Wix + Next.js repository. `frontend/` is the current Next.js site deployed to Vercel; `src/` contains legacy Wix/Velo code; `scripts/` manages Wix CMS seeding and Google Drive docs.
- Wix CMS/catalog/members are the content and identity backend. Frontend must keep user-editable copy/data CMS-driven with code fallbacks.
- Authenticated parent home is `/member-portal`; portal actions should remain in-portal rather than link to Wix account UI.
- See frontend implementation details in `mem:frontend/core`; stack in `mem:tech_stack`; completion checks in `mem:task_completion`.