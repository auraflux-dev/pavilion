#!/usr/bin/env bash
# Run a command with Doppler pavilion/dev secrets (VERCEL_TOKEN, etc.).
#
# Bootstrap: DOPPLER_TOKEN in repo .env (service token from Doppler → pavilion → dev).
#
# Usage:
#   bash scripts/doppler_run.sh vercel deploy --prod --scope robert-4220s-projects
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep '^DOPPLER_TOKEN=' "$ENV_FILE" | xargs) 2>/dev/null || true
fi

if [[ -z "${DOPPLER_TOKEN:-}" ]]; then
  echo "doppler_run.sh: DOPPLER_TOKEN missing — add to ${ENV_FILE}" >&2
  echo "  Create a service token: Doppler → pavilion → dev → Access → Service tokens" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/doppler_run.sh <command> [args...]" >&2
  exit 1
fi

exec doppler run --project pavilion --config dev -- "$@"
