#!/usr/bin/env bash
# Pavilion / robert-4220 Vercel CLI via Doppler. Never treasurer (Stone Hill www).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "${REPO_ROOT}/scripts/doppler_run.sh" env -u VERCEL_ORG_ID npx vercel "$@"
