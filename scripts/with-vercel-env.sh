#!/usr/bin/env bash
# Deprecated name — loads Vercel CLI creds via Doppler (pavilion/dev).
exec "$(cd "$(dirname "$0")" && pwd)/doppler_run.sh" "$@"
