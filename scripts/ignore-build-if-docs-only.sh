#!/usr/bin/env bash
# Vercel Ignored Build Step — exit 0 = skip build (no Build Machine minutes).
# Exit 1 = proceed with build.
#
# Skips when the commit only touches agent/docs/rules/config that cannot
# change www runtime. Anything under frontend/ (except pure docs paths) builds.
set -euo pipefail

if [[ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]]; then
  # First deploy / no previous SHA — always build.
  exit 1
fi

changed=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" HEAD || true)
if [[ -z "$changed" ]]; then
  echo "ignore-build: no changed files vs previous SHA — skip"
  exit 0
fi

# Paths that never need a production Next build
skip_re='^(\.cursor/|\.serena/|docs/|scripts/.*\.(md|MD)$|.*\.mdc$|.*\.md$|HANDOFF\.md|README\.md|\.gitignore$|doppler\.yaml$|AGENTS\.md$)'

needs_build=0
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ "$f" =~ $skip_re ]]; then
    echo "ignore-build: skip-ok $f"
    continue
  fi
  # frontend app code / public / config that affects runtime
  if [[ "$f" == frontend/* ]] || [[ "$f" == package.json ]] || [[ "$f" == package-lock.json ]]; then
    echo "ignore-build: build $f"
    needs_build=1
    break
  fi
  # unknown root file — build to be safe
  echo "ignore-build: build (unknown) $f"
  needs_build=1
  break
done <<< "$changed"

if [[ "$needs_build" -eq 0 ]]; then
  echo "ignore-build: docs/rules-only — skipping Vercel build"
  exit 0
fi
exit 1
