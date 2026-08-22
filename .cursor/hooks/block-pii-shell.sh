#!/usr/bin/env bash
# Block shell commands that commonly pull prod secrets or PII/finance data.
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | node -e '
let d = ""
process.stdin.on("data", (c) => { d += c })
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d)
    process.stdout.write(String(j.command ?? ""))
  } catch {
    process.stdout.write("")
  }
})
')

deny() {
  local msg="$1"
  node -e "
    const msg = process.argv[1];
    console.log(JSON.stringify({
      permission: 'deny',
      user_message: msg,
      agent_message: msg,
    }));
  " "$msg"
  exit 2
}

lc=$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]')

# Production secrets on disk
if printf '%s' "$lc" | grep -qE 'vercel[[:space:]]+env[[:space:]]+(pull|ls|add|rm|update)'; then
  deny "Blocked: vercel env commands can expose production secrets. Rob runs these manually."
fi

# Env files
if printf '%s' "$lc" | grep -qE '(^|[[:space:]|])(cat|head|tail|less|more|sed|awk|grep)[[:space:]].*\.env'; then
  deny "Blocked: reading .env files is not allowed for agents."
fi

# Live Wix data API
if printf '%s' "$lc" | grep -qE 'wixapis\.com/.*/wix-data|wix-data/v[0-9]+/items'; then
  deny "Blocked: Wix Data API calls can return parent/student/financial records."
fi

# High-risk ops scripts
if printf '%s' "$lc" | grep -qE 'sanitize-students-directory|rollover-import-grades|check-newsletter-roster|backfill-cove-square|backup-cms|cms-backup'; then
  deny "Blocked: ops script may read or write roster/financial CMS data."
fi

# Direct database
if printf '%s' "$lc" | grep -qE '(^|[[:space:]])(psql|pg_dump|mysql)[[:space:]]'; then
  deny "Blocked: direct database access is not allowed for agents."
fi

printf '%s\n' '{"permission":"allow"}'
exit 0
