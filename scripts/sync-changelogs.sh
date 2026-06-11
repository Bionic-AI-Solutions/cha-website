#!/usr/bin/env bash
# sync-changelogs.sh — vendor both repos' CHANGELOG.md into this repo.
#
# WHY A SNAPSHOT: the website Docker build cannot see the OSS / CHA-com
# repos, so we vendor copies (same pattern as sync-helm-values.sh). The
# Roadmap page (src/pages/roadmap.astro) renders its "Shipped" section
# from these snapshots at build time via src/data/changelog.ts — every
# release it lists is guaranteed to exist in the real CHANGELOGs.
#
# RE-SYNC (after every release in either repo):
#   ./scripts/sync-changelogs.sh && npm run build
#
# Override repo locations with CHA_OSS_REPO / CHA_PAID_REPO if they are
# not the sibling checkouts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(dirname "$SCRIPT_DIR")"
OSS_REPO="${CHA_OSS_REPO:-$SITE_ROOT/../cluster-health-autopilot}"
PAID_REPO="${CHA_PAID_REPO:-$SITE_ROOT/../CHA-com}"
SYNC_DATE="$(date -u +%Y-%m-%d)"

sync_one() {
  local src="$1" dest="$2" source_label="$3"
  [ -f "$src" ] || { echo "ERROR: $src not found (set CHA_OSS_REPO / CHA_PAID_REPO)" >&2; exit 1; }
  {
    echo "<!-- DO NOT EDIT — vendored snapshot of $source_label -->"
    echo "<!-- source: $source_label -->"
    echo "<!-- synced: $SYNC_DATE -->"
    echo "<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->"
    echo
    cat "$src"
  } > "$dest"
  echo "Synced $src -> $dest"
}

sync_one "$OSS_REPO/CHANGELOG.md" "$SITE_ROOT/src/data/changelog-oss.snapshot.md" \
  "CHANGELOG.md (Bionic-AI-Solutions/cluster-health-autopilot)"
sync_one "$PAID_REPO/CHANGELOG.md" "$SITE_ROOT/src/data/changelog-paid.snapshot.md" \
  "CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private)"
