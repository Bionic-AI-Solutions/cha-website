#!/usr/bin/env bash
# sync-changelogs.sh — vendor both repos' CHANGELOG.md into this repo.
#
# WHY A SNAPSHOT: the website Docker build cannot see the OSS / Srenix Enterprise
# repos, so we vendor copies (same pattern as sync-helm-values.sh). The
# Roadmap page (src/pages/roadmap.astro) renders its "Shipped" section
# from these snapshots at build time via src/data/changelog.ts — every
# release it lists is guaranteed to exist in the real CHANGELOGs.
#
# RE-SYNC (after every release in either repo):
#   ./scripts/sync-changelogs.sh && npm run build
#
# Override repo locations with SRENIX_OSS_REPO / SRENIX_PAID_REPO if they are
# not the sibling checkouts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(dirname "$SCRIPT_DIR")"
OSS_REPO="${SRENIX_OSS_REPO:-$SITE_ROOT/../agentic-sre}"
PAID_REPO="${SRENIX_PAID_REPO:-$SITE_ROOT/../Srenix Enterprise}"
SYNC_DATE="$(date -u +%Y-%m-%d)"

# max_releases: this repo is PUBLIC. Vendor ONLY the newest N release
# sections (exactly what the public roadmap page renders) — never the
# full file. This matters for Srenix Enterprise, whose CHANGELOG is private and
# confidential beyond the rendered release highlights.
sync_one() {
  local src="$1" dest="$2" source_label="$3" max_releases="$4"
  [ -f "$src" ] || { echo "ERROR: $src not found (set SRENIX_OSS_REPO / SRENIX_PAID_REPO)" >&2; exit 1; }
  {
    echo "<!-- DO NOT EDIT — vendored snapshot of $source_label -->"
    echo "<!-- source: $source_label -->"
    echo "<!-- synced: $SYNC_DATE -->"
    echo "<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->"
    echo "<!-- truncated to newest $max_releases release sections; the public roadmap renders these only -->"
    echo
    awk -v max="$max_releases" '
      /^## \[[0-9]/ { count++ }   # versioned releases only — [Unreleased] is excluded
      count > max { exit }
      count >= 1 { print }
    ' "$src"
  } > "$dest"
  echo "Synced $src -> $dest (top $max_releases releases)"
}

sync_one "$OSS_REPO/CHANGELOG.md" "$SITE_ROOT/src/data/changelog-oss.snapshot.md" \
  "CHANGELOG.md (srenix-ai/agentic-sre)" 12
sync_one "$PAID_REPO/CHANGELOG.md" "$SITE_ROOT/src/data/changelog-paid.snapshot.md" \
  "CHANGELOG.md (srenix-ai/agentic-sre-enterprise, private)" 12
