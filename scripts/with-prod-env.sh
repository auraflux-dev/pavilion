#!/usr/bin/env bash
set -euo pipefail
PROD_ENV="${HOME}/.shmspto/prod.env"
if [[ ! -f "$PROD_ENV" ]]; then
  echo "Missing $PROD_ENV — copy prod secrets there for ops/deploy." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$PROD_ENV"
set +a
exec "$@"
