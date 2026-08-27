# Pavilion product deploy / promote

**Product repo:** auraflux-dev/pavilion  
**Customer #1:** shmspto (www) — promote, do not auto-ship during school hours  
**Customer #2:** auraflux-dev/lumi (Wix OK)

```bash
node scripts/ship-pavilion.mjs --target commons-pto-demo
node scripts/promote-to-shms.mjs          # dry-run
node scripts/promote-to-shms.mjs --apply # write shmspto tree only
```

Demo ship ≠ www. Hotfix on www → `--from-shms` same day.
