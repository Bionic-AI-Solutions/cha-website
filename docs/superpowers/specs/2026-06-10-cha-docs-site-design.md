# CHA Docs Site — Design Spec

**Date:** 2026-06-10  
**Status:** Approved  
**Repo:** `cha-website` (Astro 5 + Tailwind v4 + MDX, deployed at asre.baisoln.com)

---

## Problem

`/docs/` currently renders a stub page (`StubBody`) that says "The dedicated docs site is being built." The site has no actual documentation. Users are directed to the GitHub README, which is an engineering draft.

## Goal

Replace the stub with a real documentation section: a landing page plus 9 topic pages sourced from `cluster-health-autopilot/docs/` and the project README. OSS capabilities documented fully; paid-tier AI pages cover *what each tier does* only — no internal architecture, no Phase/RAG/attestation design details.

---

## Layout Approach

**Option C — card-grid landing → individual topic pages.**

- `/docs/` landing: card grid of 9 topic cards (mirrors the existing `/features/` page pattern).
- Each card links to a dedicated topic page at `/docs/<slug>/`.
- Each topic page has its own in-page section anchors (no global sidebar).
- Chosen over: left-sidebar (more new components) and long-scroll (harder in-page nav).

---

## URL Structure

| URL | Title | Badge |
|---|---|---|
| `/docs/` | Documentation (landing) | — |
| `/docs/quick-start/` | Quick Start | OSS |
| `/docs/k8s-probes/` | Kubernetes Probes | OSS |
| `/docs/cloud-probes/` | Cloud Probes | OSS |
| `/docs/analyzers/` | Analyzers | OSS |
| `/docs/fixers/` | Fixers | OSS |
| `/docs/ai-tiers/` | AI Tiers | Paid |
| `/docs/helm-reference/` | Helm Reference | OSS |
| `/docs/driftreport/` | DriftReport CRD | OSS |
| `/docs/integrations/` | Integrations | OSS / Paid |

---

## Components

### New: `DocsLayout.astro`

Wraps `BaseLayout`. Adds:
- Breadcrumb line: `Docs / <page title>` (linked — `Docs` → `/docs/`)
- `← Back to docs` link below the hero
- Accepts same props as `BaseLayout` (`title`, `description`) plus `topic` string for breadcrumb

Used by all 9 topic pages. The landing `/docs/index.astro` continues to use `BaseLayout` directly.

### Existing components reused (unchanged)

- `BaseLayout.astro` — HTML shell, head, fonts
- `PageHero.astro` — eyebrow + h1 + subtitle
- `Header.astro` / `Footer.astro`

### No new shared components beyond `DocsLayout`

Card markup on the landing page is inline (same pattern as `/features/index.astro` and `/integrations/index.astro`). No `DocsCard` component — the existing card HTML pattern is duplicated inline, consistent with the rest of the site.

---

## Content Style Per Topic Page

Each topic page follows this structure:

1. **`PageHero`** — eyebrow (`Docs`), title, one-sentence subtitle
2. **Intro paragraph** — 2–4 sentences, plain English, what this section covers
3. **Sections** — each section has:
   - A `<h2>` or `<h3>` heading
   - 1–3 sentences of narrative (why it matters, key behaviour)
   - A reference table OR code block (or both)
   - Callout box where needed (amber for notes, e.g. "disable with `CHA_PROBE_X=off`")
4. **"Back to docs"** link (via `DocsLayout`)

**No walls of prose.** Tables first for reference content (probe names, Helm keys, analyzer triggers). Narrative explains the *why* and *key behaviour* only.

---

## Per-Page Content Outline

### Quick Start (`/docs/quick-start/`)
Sections: Prerequisites · Download binary · Zero-trust offline mode (30-second demo) · In-cluster Helm install · Verify

### Kubernetes Probes (`/docs/k8s-probes/`)
Intro: 14 probes, read-only, every cycle.  
Reference table: Probe | What it checks | Fires when | Default on/off  
Probes: Ceph, PostgreSQL, CriticalWorkloads, ClusterNodes, PVCs, Endpoints, NodePressure, DaemonSets, PendingPods, CrashLoopBackOff, ETCD, FailedMounts, KongRoutes, GPUNodes (+ LogPatternMatcher analyzer)  
Callout: how to disable a probe (`CHA_PROBE_<NAME>=off` / Helm flag)

### Cloud Probes (`/docs/cloud-probes/`)
Intro: 25 probe families across 3 clouds, opt-in per provider, workload-identity auth only.  
Three subsections (AWS / GCP / Azure), each with a reference table: Probe | What it checks  
AWS (10): RDS, EBS, EKS control plane, EKS node groups, IAM roles, ALB target health, ACM cert expiry, KMS keys, S3 public access, VPC subnets  
GCP (7): Cloud SQL, GKE, IAM SA, Subnet, LB + Cert, GCS + KMS, Persistent Disk  
Azure (8): SQL DB, AKS, Identity, Subnet, App Gateway, Key Vault, Storage, Disk  
Callout: enable per-provider in Helm values

### Analyzers (`/docs/analyzers/`)
Intro: Analyzers run after every probe cycle; read-only; findings attach to `DriftReport` CRs.  
Reference table: Analyzer | What it detects | Severity  
Diagnostic OSS (9): SecretKeyMissing, FailingExternalSecrets, ProactiveSecretKeyCheck, UnprovisionedSecret, ImagePullAuth, CertExpiry, TLSSecretMismatch, VaultPathMissing (bring-your-own Vault client), DNSChainDrift  
Drift-class OSS (6): GitOpsDrift, WorkloadStateDrift, RBACDrift, ConfigDrift, CapacityDrift, SecurityDrift  
Log / workload OSS (4): DisruptionDrift, OOMKillRecurrence, PVOrphan, CronJobStuck  
Paid tier adds 4 analyzers: VaultPathDriftPro, CertificateChainAnomaly, MultiClusterDrift, StatefulSetReplicaPressure (capability names listed; no internal design details)

### Fixers (`/docs/fixers/`)
Intro: 5 fixers, all opt-in, policy-bounded, re-verified after every run.  
Reference table: Fixer | What it fixes | Opt-in flag  
Fixers: StaleErrorPods, StuckJobsWithBadSecretRef, StuckRSPods, StuckCertificateRequests, TLSSecretMismatch (opt-in)  
Section: Safety gates — GitOps skip, paused/suspended skip, cert-manager health check  
Section: Dry-run mode  
Section: Re-verify loop — diagnose → fix → re-diagnose → resolve

### AI Tiers (`/docs/ai-tiers/`)
Intro: The paid `cha-com` binary adds an LLM layer on top of the OSS engine. Same policy bounds, same RBAC ceiling, approval-gated.  
Reference table: Tier | Name | What it does | Approval required  
T0 — Diagnostic narrative (read-only LLM enrichment of findings)  
T1 — Fix proposals (LLM proposes an action; signed URL delivers to Slack for one-click approval)  
T2 — Multi-step planner (up to 5 steps, prerequisite-linked)  
T3 — Vault runbook proposer (dual-approval, never auto-run)  
Section: Enabling AI tiers (Helm flags: `ai.enabled`, `ai.tier`, `ai.endpoint`, `ai.model`)  
Section: BYOL (bring your own LLM) — any OpenAI-compatible endpoint; in-cluster vLLM recommended  
**Explicitly excluded:** Phase 2/3 internals, RAG architecture, Ed25519 attestation mechanics, auto-merge gate, circuit-breaker details, audit-bundle format. Those are internal design, not user-facing capability docs.

### Helm Reference (`/docs/helm-reference/`)
Intro: All values.yaml options grouped by feature area. Full chart at `charts/cluster-health-autopilot/`.  
Groups: Core workloads · Cloud probes · Analyzers (per-analyzer toggles) · Fixers · Ticketing · AI tiers · RBAC / namespaces  
Each group: table of key | default | description  
Focus on the most commonly changed values; link to GitHub for the full chart.

### DriftReport CRD (`/docs/driftreport/`)
Intro: Every finding creates or updates a `DriftReport` CR. `kubectl get driftreports -A` is your real-time cluster drift state.  
Section: Schema — spec fields, status fields  
Section: Status values (open, resolved, suppressed)  
Section: kubectl examples — get, describe, watch  
Section: Using DriftReports in GitOps (reading from ArgoCD / Flux hooks)

### Integrations (`/docs/integrations/`)
Subsections:  
**Slack** — 3-channel routing (critical / warning / info), repeat intervals, Secret setup  
**Alertmanager** — webhook receiver config, alert labels  
**OpenProject** (OSS) — MCP ticketing sink, DriftReport → ticket idempotency  
**Jira / ServiceNow** — paid tier; mention capability, link to contact  
**Prometheus metrics** — `/metrics:9090`, key `cha_*` metric families (paid `aiwatch`)  
**Webhook triggers** — HMAC-authenticated POST to `/webhook/<source>`, Sign() helper  

---

## What Is Explicitly Out of Scope

- Sidebar nav component (no cross-page nav tree)
- Search
- Versioning / multi-version docs
- Paid AI internal architecture (Phase 2/3 RAG, Ed25519, audit-bundle, auto-merge gate)
- Pricing details (those live on `/pricing/`)
- Roadmap details (those live on `/roadmap/`)
- Blog/changelog

---

## File List

```
src/
  layouts/
    DocsLayout.astro              ← new
  pages/
    docs/
      index.astro                 ← replace stub
      quick-start/index.astro     ← new
      k8s-probes/index.astro      ← new
      cloud-probes/index.astro    ← new
      analyzers/index.astro       ← new
      fixers/index.astro          ← new
      ai-tiers/index.astro        ← new
      helm-reference/index.astro  ← new
      driftreport/index.astro     ← new
      integrations/index.astro    ← new
```

10 files total (1 layout + 1 landing + 8 topic pages). No MDX, no new npm dependencies.

---

## Non-Goals / Explicit Decisions

- **No MDX** — all content as structured Astro components; consistent with the rest of the site.
- **No new npm deps** — Tailwind v4 and Astro 5 already cover everything needed.
- **No sidebar** — each page is self-contained; breadcrumb + back link is sufficient navigation.
- **No dark-mode toggle** — site already respects `prefers-color-scheme`; no change.
