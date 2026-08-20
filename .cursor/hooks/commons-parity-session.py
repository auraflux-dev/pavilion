#!/usr/bin/env python3
"""sessionStart hook: inject Commons vs Stone Hill SHA parity for the agent."""
import json
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
script = os.path.join(ROOT, "scripts", "commons-parity.mjs")

base = (
    "Commons parity: one repo, two Vercel projects. After every application ship, "
    "deploy Stone Hill (frontend) and Commons (commons-pto-demo) from the same clean SHA. "
    "Commons is not git-connected. If Commons production lags origin/main or Stone Hill "
    "production, catch Commons up from that SHA. Plaid stays on Trial until paying clients."
)

report = ""
try:
    subprocess.run(
        ["git", "fetch", "origin", "main", "--quiet"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        timeout=20,
    )
    out = subprocess.run(
        ["node", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=25,
    )
    report = (out.stdout or out.stderr or "").strip()
except Exception:
    report = ""

ctx = base if not report else f"{base} Latest check: {report}"
sys.stdout.write(json.dumps({"additional_context": ctx}))
sys.exit(0)
