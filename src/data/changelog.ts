/**
 * changelog.ts — build-time loader for the vendored CHANGELOG snapshots.
 *
 * Parses src/data/changelog-{oss,paid}.snapshot.md (created by
 * scripts/sync-changelogs.sh) into {version, date, highlights[]} arrays so
 * the Roadmap page's "Shipped" section can never list a release that does
 * not exist in the real CHANGELOGs.
 *
 * Tolerates the real files' known quirks:
 *   - doubled date strings ("## [1.25.0] — 2026-06-11 — 2026-06-11"):
 *     the first date wins;
 *   - trailing annotations ("## [1.9.1] — 2026-05-30 (UNPUBLISHED — …)"):
 *     captured as a note;
 *   - out-of-order old entries deep in the file: entries are taken in file
 *     order (newest releases are at the top of both files), never sorted,
 *     never crashed on;
 *   - two body styles: "### Added — Title" rich headings (new) and bare
 *     "### Added" + bullet lists (old).
 *
 * Re-sync after a release: ./scripts/sync-changelogs.sh && npm run build
 */
import fs from 'node:fs';
import path from 'node:path';

export interface ChangelogRelease {
  version: string; // "1.25.1" (no v prefix, as written in the files)
  date: string; // "2026-06-11" (first date when the heading doubles it)
  note: string; // trailing heading annotation, e.g. "UNPUBLISHED — superseded"
  highlights: string[];
}

export interface ChangelogSnapshot {
  source: string;
  syncedDate: string;
  releases: ChangelogRelease[];
}

const SNAPSHOT_FILES = {
  oss: 'changelog-oss.snapshot.md',
  paid: 'changelog-paid.snapshot.md',
} as const;

export type ChangelogRepo = keyof typeof SNAPSHOT_FILES;

const MAX_RELEASES = 10;
const MAX_HIGHLIGHTS = 6;

// "## [1.25.0] — 2026-06-11 — 2026-06-11" / "## [1.9.1] — 2026-05-30 (UNPUBLISHED — …)"
// First date wins; anything after it (doubled dates, parenthetical notes) goes to `rest`.
// Pre-release suffixes (1.2.3-rc1) are accepted; a heading with NO date is
// still skipped (KNOWN GAP — such an entry silently drops off the page).
const RELEASE_RE = /^## \[(\d+\.\d+\.\d+(?:-[\w.]+)?)\]\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})(.*)$/;

/** Strip inline markdown (bold, code ticks, links) and collapse whitespace. */
function cleanInline(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-boundary truncation (same convention as helm-values.ts). */
function truncate(text: string, maxLen = 220): string {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(' ', maxLen - 1);
  return `${text.slice(0, cut > 0 ? cut : maxLen - 1).trimEnd()}…`;
}

function parseHeadingRest(rest: string): string {
  // Drop doubled "— 2026-06-11" repeats, keep a "(NOTE …)" annotation if any.
  const withoutDates = rest.replace(/\s*[—–-]+\s*\d{4}-\d{2}-\d{2}/g, '').trim();
  const note = withoutDates.match(/^\((.*)\)$/);
  return note ? note[1].trim() : withoutDates;
}

function parseHighlights(bodyLines: string[]): string[] {
  const highlights: string[] = [];
  let category = ''; // current bare "### Added"-style category
  let collectBullets = false; // bullets only count under bare-category headings

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];

    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      const heading = cleanInline(h3[1]);
      const split = heading.split(/\s+[—–-]\s+/); // "Added — Title" (em/en dash or spaced hyphen)
      if (/^Tests?$/i.test(split[0])) {
        // Test-count bookkeeping sections are changelog hygiene, not
        // roadmap-page material.
        collectBullets = false;
        continue;
      }
      if (split.length > 1) {
        // Rich heading: the title IS the highlight; skip its bullets.
        highlights.push(truncate(`${split[0]}: ${split.slice(1).join(' — ')}`));
        collectBullets = false;
      } else {
        // Bare category ("### Fixed"): following top-level bullets are highlights.
        category = heading;
        collectBullets = true;
      }
      continue;
    }

    if (collectBullets && /^- /.test(line)) {
      // Top-level bullet; absorb wrapped continuation lines (indented prose).
      let text = line.slice(2);
      while (i + 1 < bodyLines.length && /^\s+\S/.test(bodyLines[i + 1]) && !/^\s+- /.test(bodyLines[i + 1])) {
        text += ` ${bodyLines[i + 1].trim()}`;
        i++;
      }
      highlights.push(truncate(`${category}: ${cleanInline(text)}`));
    }
  }

  if (highlights.length === 0) {
    // No ### sections (e.g. UNPUBLISHED stubs, prose-only entries):
    // fall back to the first non-empty prose line.
    const prose = bodyLines.find((l) => l.trim() && !/^[-#>]/.test(l.trim()));
    if (prose) highlights.push(truncate(cleanInline(prose)));
  }

  return highlights.slice(0, MAX_HIGHLIGHTS);
}

export function loadChangelog(repo: ChangelogRepo): ChangelogSnapshot {
  const snapshotPath = path.join(process.cwd(), 'src', 'data', SNAPSHOT_FILES[repo]);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(
      `${SNAPSHOT_FILES[repo]} is missing. Run ./scripts/sync-changelogs.sh to vendor the CHANGELOGs.`
    );
  }
  const raw = fs.readFileSync(snapshotPath, 'utf8');
  if (!raw.trim()) {
    throw new Error(`${SNAPSHOT_FILES[repo]} is empty. Re-run ./scripts/sync-changelogs.sh.`);
  }

  const source = raw.match(/^<!-- source: (.+) -->$/m)?.[1]?.trim() ?? 'unknown';
  const syncedDate = raw.match(/^<!-- synced: (.+) -->$/m)?.[1]?.trim() ?? 'unknown';

  const lines = raw.split('\n');
  const releases: ChangelogRelease[] = [];

  for (let i = 0; i < lines.length && releases.length < MAX_RELEASES; i++) {
    const m = lines[i].match(RELEASE_RE);
    if (!m) continue; // skips "## [Unreleased]" and all non-heading lines

    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length && !/^## /.test(lines[j]); j++) body.push(lines[j]);
    i = j - 1;

    releases.push({
      version: m[1],
      date: m[2],
      note: parseHeadingRest(m[3] ?? ''),
      highlights: parseHighlights(body),
    });
  }

  if (releases.length === 0) {
    throw new Error(`${SNAPSHOT_FILES[repo]} parsed to zero releases — snapshot is corrupt.`);
  }
  return { source, syncedDate, releases };
}
