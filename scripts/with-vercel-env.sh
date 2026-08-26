#!/usr/bin/env bash
# Load repo-local .env.vercel then run a command (e.g. vercel deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.vercel"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "  cp .env.vercel.example .env.vercel" >&2
  echo "  Add VERCEL_TOKEN from robert-4220 Vercel account → Settings → Tokens" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is empty in $ENV_FILE" >&2
  exit 1
fi
exec "$@"
