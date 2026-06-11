#!/usr/bin/env bash
# sync-helm-values.sh — vendor the OSS chart's values.yaml into this repo.
#
# WHY A SNAPSHOT: the website Docker build cannot see the OSS repo, so we
# vendor a copy. The Helm Reference page (src/pages/docs/helm-reference.astro)
# is GENERATED from this snapshot at build time via src/data/helm-values.ts —
# every key it documents is guaranteed to exist in the chart.
#
# RE-SYNC (e.g. after the chart adds new toggles — see OSS task P1.8 which
# adds analyzers/probes env coverage + watcher.extraEnv):
#   ./scripts/sync-helm-values.sh && npm run build
#
# Override the OSS repo location with CHA_OSS_REPO if it is not the sibling
# checkout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(dirname "$SCRIPT_DIR")"
OSS_REPO="${CHA_OSS_REPO:-$SITE_ROOT/../cluster-health-autopilot}"
CHART_DIR="$OSS_REPO/charts/cluster-health-autopilot"
SRC="$CHART_DIR/values.yaml"
CHART_YAML="$CHART_DIR/Chart.yaml"
DEST="$SITE_ROOT/src/data/helm-values.snapshot.yaml"

[ -f "$SRC" ] || { echo "ERROR: $SRC not found (set CHA_OSS_REPO)" >&2; exit 1; }
[ -f "$CHART_YAML" ] || { echo "ERROR: $CHART_YAML not found" >&2; exit 1; }

CHART_VERSION="$(awk '$1 == "version:" { print $2; exit }' "$CHART_YAML")"
SYNC_DATE="$(date -u +%Y-%m-%d)"

{
  echo "# DO NOT EDIT — vendored snapshot of the OSS chart's default values."
  echo "# source: charts/cluster-health-autopilot/values.yaml (Bionic-AI-Solutions/cluster-health-autopilot)"
  echo "# chart-version: $CHART_VERSION"
  echo "# synced: $SYNC_DATE"
  echo "# re-sync: ./scripts/sync-helm-values.sh && npm run build"
  echo
  cat "$SRC"
} > "$DEST"

echo "Synced $SRC (chart $CHART_VERSION) -> $DEST"
