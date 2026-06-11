/**
 * helm-values.ts — build-time loader for the vendored chart values snapshot.
 *
 * Parses src/data/helm-values.snapshot.yaml (created by
 * scripts/sync-helm-values.sh) into a flat key → {default, description}
 * table, grouped by top-level key. The chart's own comments become the
 * descriptions, so the Helm Reference page can never document a key that
 * does not exist in the real chart.
 *
 * Re-sync after a chart change: ./scripts/sync-helm-values.sh && npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseDocument, isMap, isSeq, isScalar, type Pair, type YAMLMap } from 'yaml';

export interface HelmRow {
  key: string;
  default: string;
  desc: string;
}

export interface HelmGroup {
  /** top-level values key, e.g. "watcher" */
  name: string;
  /** chart comment block above the top-level key (may be empty) */
  desc: string;
  rows: HelmRow[];
}

export interface HelmSnapshot {
  chartVersion: string;
  syncedDate: string;
  groups: HelmGroup[];
}

// astro build always runs from the project root, and import.meta.url points
// into dist/ after bundling — so resolve from cwd, not from this module.
const SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'data', 'helm-values.snapshot.yaml');

/** Strip leading '#' markers, collapse whitespace, optionally truncate. */
function cleanComment(raw: string | null | undefined, maxLen = 280): string {
  if (!raw) return '';
  const text = raw
    .split('\n')
    .map((l) => l.replace(/^\s*#?\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(' ', maxLen - 1);
  return `${text.slice(0, cut > 0 ? cut : maxLen - 1).trimEnd()}…`;
}

/** Render a scalar / empty-collection default the way you'd pass it to --set. */
function renderDefault(node: unknown): string {
  if (isSeq(node)) {
    const items = node.items.map((i) => (isScalar(i) ? String(i.value ?? '') : '…'));
    return items.length ? `[${items.join(', ')}]` : '[]';
  }
  if (isMap(node)) return '{}'; // only reached for empty maps
  if (isScalar(node)) {
    if (node.value === null || node.value === undefined || node.value === '') return '""';
    return String(node.value);
  }
  return '""';
}

function walk(map: YAMLMap, prefix: string, rows: HelmRow[]): void {
  (map.items as Pair[]).forEach((item, idx) => {
    const keyNode = item.key as { value?: unknown; commentBefore?: string | null };
    const key = String(keyNode.value ?? '');
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = item.value;

    // The yaml AST attaches a comment block that precedes the FIRST key of a
    // nested block map to the map node itself, not to that key.
    const before =
      keyNode.commentBefore ??
      (idx === 0 ? (map as { commentBefore?: string | null }).commentBefore : null);

    if (isMap(value) && value.items.length > 0) {
      walk(value, fullKey, rows);
      return;
    }

    // Leaf: scalar, sequence, or empty map. Anything else (e.g. a YAML
    // anchor/alias) would silently vanish from the docs — fail the build instead.
    if (!isScalar(value) && !isSeq(value) && !isMap(value) && value !== null) {
      throw new Error(`helm-values: unsupported YAML node type at "${fullKey}" — extend renderDefault/walk to handle it`);
    }
    const inline = isScalar(value) || isSeq(value) || isMap(value) ? (value as { comment?: string | null }).comment : null;
    const desc = cleanComment(inline) || cleanComment(before);
    rows.push({ key: fullKey, default: renderDefault(value), desc });
  });
}

export function loadHelmSnapshot(): HelmSnapshot {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `helm-values.snapshot.yaml is missing. Run ./scripts/sync-helm-values.sh to vendor the chart's values.yaml.`
    );
  }
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  if (!raw.trim()) {
    throw new Error(
      `helm-values.snapshot.yaml is empty. Re-run ./scripts/sync-helm-values.sh.`
    );
  }

  const chartVersion = raw.match(/^# chart-version: (.+)$/m)?.[1]?.trim() ?? 'unknown';
  const syncedDate = raw.match(/^# synced: (.+)$/m)?.[1]?.trim() ?? 'unknown';

  const doc = parseDocument(raw);
  if (doc.errors.length) {
    throw new Error(`helm-values.snapshot.yaml failed to parse: ${doc.errors[0].message}`);
  }
  const root = doc.contents;
  if (!isMap(root) || root.items.length === 0) {
    throw new Error('helm-values.snapshot.yaml parsed to an empty document.');
  }

  const groups: HelmGroup[] = [];
  for (const item of root.items as Pair[]) {
    const keyNode = item.key as { value?: unknown; commentBefore?: string | null };
    const name = String(keyNode.value ?? '');
    const rows: HelmRow[] = [];
    const value = item.value;
    if (isMap(value) && value.items.length > 0) {
      walk(value, name, rows);
    } else {
      const inline = (value as { comment?: string | null } | null)?.comment;
      rows.push({
        key: name,
        default: renderDefault(value),
        desc: cleanComment(inline) || cleanComment(keyNode.commentBefore),
      });
    }
    groups.push({ name, desc: cleanComment(keyNode.commentBefore, 400), rows });
  }

  if (groups.length === 0) {
    throw new Error('helm-values.snapshot.yaml produced zero groups — snapshot is corrupt.');
  }
  return { chartVersion, syncedDate, groups };
}
