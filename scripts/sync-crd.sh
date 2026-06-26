#!/usr/bin/env bash
# sync-crd.sh — vendor the OSS chart's DriftReport CRD into this repo.
#
# WHY A SNAPSHOT: the website Docker build cannot see the OSS repo, so we
# vendor a copy. The DriftReport docs page (src/pages/docs/driftreport.astro)
# is GENERATED from this snapshot at build time via
# src/data/driftreport-crd.ts — every field it documents is guaranteed to
# exist in the real CRD (charts/agentic-sre/templates/
# crd-driftreport.yaml).
#
# The chart template wraps the CRD in Helm directives ({{- if ... }},
# {{- include ... }}); those lines are stripped so the snapshot parses as
# plain YAML. Nothing inside the openAPIV3Schema uses templating.
#
# RE-SYNC (after the OSS chart changes the CRD):
#   ./scripts/sync-crd.sh && npm run build
#
# Override the OSS repo location with SRENIX_OSS_REPO if it is not the sibling
# checkout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(dirname "$SCRIPT_DIR")"
OSS_REPO="${SRENIX_OSS_REPO:-$SITE_ROOT/../agentic-sre}"
CHART_DIR="$OSS_REPO/charts/agentic-sre"
SRC="$CHART_DIR/templates/crd-driftreport.yaml"
CHART_YAML="$CHART_DIR/Chart.yaml"
DEST="$SITE_ROOT/src/data/driftreport-crd.snapshot.yaml"

[ -f "$SRC" ] || { echo "ERROR: $SRC not found (set SRENIX_OSS_REPO)" >&2; exit 1; }
[ -f "$CHART_YAML" ] || { echo "ERROR: $CHART_YAML not found" >&2; exit 1; }

CHART_VERSION="$(awk '$1 == "version:" { print $2; exit }' "$CHART_YAML")"
SYNC_DATE="$(date -u +%Y-%m-%d)"
OSS_COMMIT="$(git -C "$OSS_REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"

{
  echo "# DO NOT EDIT — vendored snapshot of the OSS DriftReport CRD."
  echo "# source: charts/agentic-sre/templates/crd-driftreport.yaml (Srenix/agentic-sre)"
  echo "# chart-version: $CHART_VERSION"
  echo "# oss-commit: $OSS_COMMIT"
  echo "# synced: $SYNC_DATE"
  echo "# re-sync: ./scripts/sync-crd.sh && npm run build"
  echo "# NOTE: Helm template directives are stripped so this parses as plain YAML."
  echo
  grep -v '{{' "$SRC"
} > "$DEST"

echo "Synced $SRC (chart $CHART_VERSION, oss $OSS_COMMIT) -> $DEST"
