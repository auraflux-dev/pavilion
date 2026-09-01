#!/usr/bin/env bash
# Vercel Ignored Build Step when Root Directory = frontend.
# Delegates to repo-root scripts/ignore-build-if-docs-only.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec bash "$ROOT/scripts/ignore-build-if-docs-only.sh"
