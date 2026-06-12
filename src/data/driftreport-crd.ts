/**
 * driftreport-crd.ts — build-time loader for the vendored DriftReport CRD.
 *
 * Parses src/data/driftreport-crd.snapshot.yaml (created by
 * scripts/sync-crd.sh) into flat field tables for the DriftReport docs page
 * (src/pages/docs/driftreport.astro). The CRD's own openAPIV3Schema
 * descriptions become the docs, so the page can never document a field that
 * does not exist in the real CRD.
 *
 * Re-sync after a CRD change: ./scripts/sync-crd.sh && npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export interface CrdFieldRow {
  /** dotted path relative to spec/status, e.g. "resourceRef.cloud.provider" */
  field: string;
  type: string;
  required: boolean;
  desc: string;
}

export interface PrinterColumn {
  name: string;
  type: string;
  jsonPath: string;
}

export interface DriftReportCrd {
  chartVersion: string;
  ossCommit: string;
  syncedDate: string;
  scope: string;
  group: string;
  kind: string;
  plural: string;
  shortNames: string[];
  version: string;
  specFields: CrdFieldRow[];
  statusFields: CrdFieldRow[];
  printerColumns: PrinterColumn[];
}

const SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'data', 'driftreport-crd.snapshot.yaml');

interface SchemaNode {
  type?: string;
  description?: string;
  enum?: unknown[];
  format?: string;
  properties?: Record<string, SchemaNode>;
  required?: string[];
}

/** Collapse the CRD's multi-line description into one docs-friendly line. */
function cleanDesc(raw: string | undefined, en: unknown[] | undefined, format: string | undefined): string {
  let text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (en && en.length) {
    const allowed = en.map(String).join(' | ');
    text = text ? `${text} One of: ${allowed}.` : `One of: ${allowed}.`;
  }
  if (format && !text.toLowerCase().includes(format)) {
    text = text ? `${text} (${format})` : `(${format})`;
  }
  return text;
}

function walkFields(node: SchemaNode, prefix: string, requiredHere: string[], rows: CrdFieldRow[]): void {
  const props = node.properties ?? {};
  for (const [name, child] of Object.entries(props)) {
    const fieldPath = prefix ? `${prefix}.${name}` : name;
    if (child.properties && Object.keys(child.properties).length > 0) {
      rows.push({
        field: fieldPath,
        type: 'object',
        required: requiredHere.includes(name),
        desc: cleanDesc(child.description, child.enum, child.format),
      });
      walkFields(child, fieldPath, child.required ?? [], rows);
      continue;
    }
    rows.push({
      field: fieldPath,
      type: child.type ?? 'object',
      required: requiredHere.includes(name),
      desc: cleanDesc(child.description, child.enum, child.format),
    });
  }
}

export function loadDriftReportCrd(): DriftReportCrd {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error('driftreport-crd.snapshot.yaml is missing. Run ./scripts/sync-crd.sh to vendor the CRD.');
  }
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  if (!raw.trim()) {
    throw new Error('driftreport-crd.snapshot.yaml is empty. Re-run ./scripts/sync-crd.sh.');
  }

  const chartVersion = raw.match(/^# chart-version: (.+)$/m)?.[1]?.trim() ?? 'unknown';
  const ossCommit = raw.match(/^# oss-commit: (.+)$/m)?.[1]?.trim() ?? 'unknown';
  const syncedDate = raw.match(/^# synced: (.+)$/m)?.[1]?.trim() ?? 'unknown';

  const doc = parse(raw) as {
    kind?: string;
    spec?: {
      group?: string;
      scope?: string;
      names?: { kind?: string; plural?: string; shortNames?: string[] };
      versions?: Array<{
        name?: string;
        schema?: { openAPIV3Schema?: SchemaNode };
        additionalPrinterColumns?: Array<{ name: string; type: string; jsonPath: string }>;
      }>;
    };
  };

  if (doc?.kind !== 'CustomResourceDefinition' || !doc.spec?.versions?.length) {
    throw new Error('driftreport-crd.snapshot.yaml did not parse to a CRD — re-run ./scripts/sync-crd.sh.');
  }

  const version = doc.spec.versions[0];
  const schema = version.schema?.openAPIV3Schema;
  const specSchema = schema?.properties?.spec;
  const statusSchema = schema?.properties?.status;
  if (!specSchema?.properties || !statusSchema?.properties) {
    throw new Error('driftreport-crd snapshot has no spec/status schema — re-run ./scripts/sync-crd.sh.');
  }

  const specFields: CrdFieldRow[] = [];
  walkFields(specSchema, '', specSchema.required ?? [], specFields);
  const statusFields: CrdFieldRow[] = [];
  walkFields(statusSchema, '', statusSchema.required ?? [], statusFields);
  if (specFields.length === 0 || statusFields.length === 0) {
    throw new Error('driftreport-crd snapshot produced zero fields — snapshot is corrupt.');
  }

  return {
    chartVersion,
    ossCommit,
    syncedDate,
    scope: doc.spec.scope ?? 'unknown',
    group: doc.spec.group ?? 'unknown',
    kind: doc.spec.names?.kind ?? 'DriftReport',
    plural: doc.spec.names?.plural ?? 'driftreports',
    shortNames: doc.spec.names?.shortNames ?? [],
    version: version.name ?? 'unknown',
    specFields,
    statusFields,
    printerColumns: version.additionalPrinterColumns ?? [],
  };
}
