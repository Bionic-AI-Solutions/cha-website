# CHA Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/docs/` stub page with a real 10-page documentation section covering all OSS capabilities and paid-tier capabilities (what each does, not internals).

**Architecture:** Card-grid landing at `/docs/` links to 9 topic pages. All pages are `.astro` files. A new `DocsLayout.astro` wraps `BaseLayout` and injects breadcrumb + back-link around every topic page. Content is structured data arrays rendered with Tailwind — same pattern as the existing `/features/` and `/security/` pages.

**Tech Stack:** Astro 5, Tailwind v4, no new npm deps. All commands run from `cha-website/` repo root.

---

## File Map

```
src/
  layouts/
    DocsLayout.astro              ← NEW: breadcrumb + back-link wrapper
  pages/
    docs/
      index.astro                 ← REPLACE stub: card-grid landing
      quick-start.astro           ← NEW
      k8s-probes.astro            ← NEW
      cloud-probes.astro          ← NEW
      analyzers.astro             ← NEW
      fixers.astro                ← NEW
      ai-tiers.astro              ← NEW
      helm-reference.astro        ← NEW
      driftreport.astro           ← NEW
      integrations.astro          ← NEW
.gitignore                        ← ADD .superpowers/ line
```

Build command (run from `cha-website/`): `npm run build`  
Success indicator: `▶ astro build` completes with `Complete!` and no errors.

---

## Task 1: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Open `.gitignore` and add after the `.idea/` line:

```
# superpowers brainstorm sessions
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers/ brainstorm sessions"
```

---

## Task 2: DocsLayout.astro

**Files:**
- Create: `src/layouts/DocsLayout.astro`

- [ ] **Step 1: Create the file**

```astro
---
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
  description?: string;
  topic: string;
}

const { title, description, topic } = Astro.props;
---

<BaseLayout title={title} description={description}>
  <div class="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800/50 dark:bg-zinc-900/40">
    <div class="mx-auto flex max-w-5xl items-center gap-1.5 px-6 py-2.5 text-sm">
      <a
        href="/docs/"
        class="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Docs
      </a>
      <span class="text-zinc-300 dark:text-zinc-600">/</span>
      <span class="font-medium text-zinc-900 dark:text-zinc-100">{topic}</span>
    </div>
  </div>

  <slot />

  <div class="mx-auto max-w-5xl border-t border-zinc-200/70 px-6 py-10 dark:border-zinc-800/70">
    <a
      href="/docs/"
      class="text-sm font-medium text-accent-600 transition-colors hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
    >
      ← Back to docs
    </a>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

```bash
cd /home/skadam/CHA/cha-website && npm run build
```

Expected: `Complete!` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/DocsLayout.astro
git commit -m "feat(docs): add DocsLayout with breadcrumb and back-link"
```

---

## Task 3: /docs/ Landing Page

**Files:**
- Modify: `src/pages/docs/index.astro` (replace stub)

- [ ] **Step 1: Replace the stub**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PageHero from '../../components/PageHero.astro';

const topics = [
  {
    href: '/docs/quick-start/',
    title: 'Quick Start',
    summary:
      'Binary download, Helm install, zero-trust offline mode. Running diagnostics in 30 seconds.',
    badge: 'OSS',
  },
  {
    href: '/docs/k8s-probes/',
    title: 'K8s Probes',
    summary:
      '14 probes: Ceph, CNPG, Nodes, PVCs, Endpoints, NodePressure, DaemonSets, PendingPods, CrashLoopBackOff, ETCD, FailedMounts, KongRoutes, GPUNodes, LogPatternMatcher.',
    badge: 'OSS',
  },
  {
    href: '/docs/cloud-probes/',
    title: 'Cloud Probes',
    summary:
      '10 AWS · 7 GCP · 8 Azure probe families. Workload-identity auth only. Enable per-provider; off by default.',
    badge: 'OSS',
  },
  {
    href: '/docs/analyzers/',
    title: 'Analyzers',
    summary:
      '19 analyzers run after every probe cycle. Covers secrets, certs, ESO, image pulls, drift, log patterns, OOM recurrence, orphan PVs, and stuck CronJobs.',
    badge: 'OSS',
  },
  {
    href: '/docs/fixers/',
    title: 'Fixers',
    summary:
      '5 policy-bounded auto-fixers. Each is opt-in, safety-gated, and re-verified after every run.',
    badge: 'OSS',
  },
  {
    href: '/docs/ai-tiers/',
    title: 'AI Tiers',
    summary:
      'T0 narration · T1 fix proposals · T2 multi-step planning · T3 Vault runbooks. All approval-gated. Bring your own LLM.',
    badge: 'Paid',
  },
  {
    href: '/docs/helm-reference/',
    title: 'Helm Reference',
    summary:
      'Key values.yaml options grouped by feature area — watcher, cloud probes, analyzers, fixers, ticketing, AI tiers, RBAC.',
    badge: 'OSS',
  },
  {
    href: '/docs/driftreport/',
    title: 'DriftReport CRD',
    summary:
      'kubectl-queryable drift state. Schema, status values, kubectl examples, and using DriftReports in GitOps workflows.',
    badge: 'OSS',
  },
  {
    href: '/docs/integrations/',
    title: 'Integrations',
    summary:
      'Slack 3-channel routing · Alertmanager · OpenProject · Jira · ServiceNow · Prometheus metrics · Webhook triggers.',
    badge: 'OSS / Paid',
  },
];

const badgeStyles: Record<string, string> = {
  OSS: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40',
  Paid: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-900/40',
  'OSS / Paid':
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40',
};
---

<BaseLayout
  title="CHA &mdash; Docs"
  description="Documentation for Cluster Health Autopilot — installation, K8s and cloud probes, analyzers, fixers, AI tiers, Helm reference, and integrations."
>
  <PageHero
    eyebrow="Docs"
    title="Documentation"
    subtitle="Everything you need to install, configure, and operate Cluster Health Autopilot."
  />

  <section class="mx-auto max-w-7xl px-6 py-20">
    <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((t) => (
        <a
          href={t.href}
          class="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</h3>
            <span
              class:list={[
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                badgeStyles[t.badge],
              ]}
            >
              {t.badge}
            </span>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t.summary}</p>
          <p class="mt-4 text-sm font-medium text-accent-600 group-hover:text-accent-700 dark:text-accent-400 dark:group-hover:text-accent-300">
            Read more &rarr;
          </p>
        </a>
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!` — 9 card links render without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/index.astro
git commit -m "feat(docs): replace stub with 9-topic card landing"
```

---

## Task 4: Quick Start Page

**Files:**
- Create: `src/pages/docs/quick-start.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';
---

<DocsLayout
  title="CHA &mdash; Quick Start"
  description="Install and run Cluster Health Autopilot in under 30 seconds using the zero-trust offline mode, or deploy in-cluster via Helm."
  topic="Quick Start"
>
  <PageHero
    eyebrow="Docs"
    title="Quick Start"
    subtitle="Zero-trust offline diagnostics in 30 seconds. In-cluster Helm install when you're ready."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <!-- Prerequisites -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Prerequisites</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Requirement</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Minimum</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { req: 'Kubernetes', min: '1.27', note: 'Any distro — EKS, GKE, AKS, k3s, RKE2, OpenShift' },
              { req: 'kubectl', min: 'any', note: 'In PATH; kubeconfig pointing at target cluster' },
              { req: 'helm', min: '3.x', note: 'For in-cluster install only' },
              { req: 'Container pull access', min: '—', note: 'Cluster must reach docker.io' },
            ].map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-medium text-zinc-900 dark:text-zinc-100">{r.req}</td>
                <td class="py-3 pr-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.min}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          <strong>Zero-trust offline mode requires none of the above</strong> — just the <code class="font-mono">cha</code> binary and a <code class="font-mono">kubectl get -o json</code> snapshot.
        </p>
      </div>
    </div>

    <!-- Download binary -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">1. Download the binary</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Pre-built binaries for <code class="font-mono">linux/amd64</code>, <code class="font-mono">linux/arm64</code>, <code class="font-mono">darwin/amd64</code>, <code class="font-mono">darwin/arm64</code>.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# Linux amd64
curl -sSL https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/releases/latest/download/cluster-health-autopilot_Linux_x86_64.tar.gz \\
  | tar xz && sudo mv cha /usr/local/bin/

# macOS arm64
curl -sSL https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/releases/latest/download/cluster-health-autopilot_Darwin_arm64.tar.gz \\
  | tar xz && sudo mv cha /usr/local/bin/

# Verify
cha version`}</code></pre>
    </div>

    <!-- Zero-trust offline mode -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">2. Zero-trust offline mode (no install needed)</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Run diagnostics against a captured snapshot — no cluster RBAC, no write permissions, no Helm chart. Useful for evaluating CHA before any install.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# Clone the repo to get sample fixtures
git clone https://github.com/Bionic-AI-Solutions/cluster-health-autopilot.git
cd cluster-health-autopilot

# Run against the bundled sample cluster
cha diagnose --snapshot examples/sample-cluster`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Against a live cluster:
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# Capture a snapshot (read-only — never modifies cluster state)
cha snapshot capture --out ./my-cluster

# Diagnose offline
cha diagnose --snapshot ./my-cluster

# Or diagnose live directly
cha diagnose --live`}</code></pre>
    </div>

    <!-- In-cluster Helm install -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">3. In-cluster install via Helm</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Installs a watcher Deployment and diagnose/remediate CronJobs. Watches Kubernetes events with a ~10s debounce.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`helm repo add cha https://bionic-ai-solutions.github.io/cluster-health-autopilot
helm repo update
helm install cha cha/cluster-health-autopilot \\
  --namespace cluster-health-autopilot --create-namespace \\
  --set watcher.enabled=true`}</code></pre>
    </div>

    <!-- Verify -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">4. Verify</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`kubectl get driftreports -A
# NAMESPACE   NAME                   AGE
# kube-system driftreport-stuck-...  12s

kubectl get pods -n cluster-health-autopilot`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        See the <a href="/docs/driftreport/" class="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300">DriftReport CRD docs</a> for the full schema and kubectl query patterns.
      </p>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/quick-start.astro
git commit -m "feat(docs): add Quick Start page"
```

---

## Task 5: K8s Probes Page

**Files:**
- Create: `src/pages/docs/k8s-probes.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const probes = [
  { name: 'Ceph', checks: 'Rook-Ceph health, OSD readiness, capacity %', fires: 'HEALTH_ERR or ≥80% capacity', disable: 'CHA_PROBE_CEPH=off' },
  { name: 'PostgreSQL', checks: 'CNPG + Zalando Spilo/Patroni clusters (auto-detected)', fires: 'Replica not ready, primary missing', disable: 'CHA_PROBE_POSTGRES=off' },
  { name: 'CriticalWorkloads', checks: 'Configurable list of critical Deployments/StatefulSets', fires: 'READY count < desired', disable: 'CHA_PROBE_CRITICAL_WORKLOADS=off' },
  { name: 'ClusterNodes', checks: 'Node Ready condition', fires: 'Any node NotReady', disable: 'CHA_PROBE_NODES=off' },
  { name: 'PVCs', checks: 'PersistentVolumeClaim phase', fires: 'Any PVC not Bound', disable: 'CHA_PROBE_PVCS=off' },
  { name: 'Endpoints', checks: 'HTTP/S probe of each Ingress host (auto-discovered)', fires: '2-of-2 consecutive failures (flake-suppressed)', disable: 'CHA_PROBE_ENDPOINTS=off' },
  { name: 'NodePressure', checks: 'DiskPressure / MemoryPressure / PIDPressure / NetworkUnavailable', fires: 'Any pressure condition True; DiskPressure → Critical', disable: 'CHA_PROBE_NODE_PRESSURE=off' },
  { name: 'DaemonSets', checks: '8 system namespaces (kube-system, cilium, calico, flannel, rook-ceph, longhorn, openebs, metallb)', fires: 'desiredNumberScheduled ≠ numberReady', disable: 'CHA_PROBE_DAEMONSETS=off' },
  { name: 'PendingPods', checks: 'Pods with PodScheduled=False past 60s grace', fires: 'Insufficient CPU/Memory, unbound PVC, taint/nodeSelector mismatch', disable: 'CHA_PROBE_PENDING_PODS=off' },
  { name: 'CrashLoopBackOff', checks: 'Any namespace; protected-ns escalates immediately', fires: 'Protected-ns: always Critical; user-ns: past restart threshold (default 10)', disable: 'CHA_PROBE_CRASHLOOP=off' },
  { name: 'ETCD', checks: 'kubeadm static-pod etcd members; "blind probe" warning on managed etcd', fires: 'Member unhealthy; Warning on managed/external etcd', disable: 'CHA_PROBE_ETCD=off' },
  { name: 'FailedMounts', checks: 'Pods stuck ContainerCreating past 90s + kubelet FailedMount/FailedAttach events', fires: 'Volume mount failure confirmed by kubelet event', disable: 'CHA_PROBE_FAILED_MOUNTS=off' },
  { name: 'KongRoutes', checks: 'For each Kong-managed Ingress: backend Service has ≥1 ready Endpoint + KongPlugin/Consumer annotation refs resolve', fires: 'No ready endpoints or dangling annotation', disable: 'CHA_PROBE_KONG_ROUTES=off' },
  { name: 'GPUNodes', checks: 'nvidia.com/gpu + amd.com/gpu node allocatability', fires: 'GPU node NotReady, cordoned, or zero allocatable GPU', disable: 'CHA_PROBE_GPU_NODES=off' },
];
---

<DocsLayout
  title="CHA &mdash; K8s Probes"
  description="14 Kubernetes probes covering storage, compute, networking, GPU, and workload health. Each runs on every cycle against the Kubernetes API — no metrics scraping."
  topic="K8s Probes"
>
  <PageHero
    eyebrow="Docs"
    title="Kubernetes Probes"
    subtitle="14 probes run on every cycle against the Kubernetes API — read-only, no metrics scraping, no log shipping."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Probes are the detection layer. Each probe reads one area of cluster state and emits a health signal (Healthy / Warning / Critical). Probe results feed the analyzers and fixers. All probes are read-only — they never modify cluster state.
      </p>
      <div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          <strong>Disable any probe</strong> with an env var (<code class="font-mono">CHA_PROBE_NAME=off</code>) or Helm flag (<code class="font-mono">probes.name.enabled: false</code>). Each probe is independently togglable.
        </p>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Probe reference</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Probe</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">What it checks</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Fires when</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Disable env var</th>
            </tr>
          </thead>
          <tbody>
            {probes.map((p) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</td>
                <td class="py-3 pr-6 text-zinc-600 dark:text-zinc-400">{p.checks}</td>
                <td class="py-3 pr-6 text-zinc-600 dark:text-zinc-400">{p.fires}</td>
                <td class="py-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">{p.disable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">LogPatternMatcher analyzer</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Ships alongside the M3 probes. Scans pod logs for recurring patterns — <code class="font-mono">ImagePullBackOff</code>, <code class="font-mono">OOMKilled</code>, probe-failed, volume-attach-failed, RBAC Forbidden — and deduplicates by <code class="font-mono">(object, pattern)</code> before emitting a finding. Reported as a Warning; does not auto-fix.
      </p>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Trigger classes</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Probes run on three trigger classes: <strong>A</strong> (Kubernetes informers — react within ~10s of any resource event), <strong>C</strong> (Alertmanager polling — catches slow-drift signals like disk fill or cert expiry), and <strong>E</strong> (external HMAC-authenticated webhook — immediate cycle on external signal). CronJob resync runs on the schedule in Helm values as a safety net.
      </p>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/k8s-probes.astro
git commit -m "feat(docs): add K8s Probes reference page"
```

---

## Task 6: Cloud Probes Page

**Files:**
- Create: `src/pages/docs/cloud-probes.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const aws = [
  { name: 'RDS', checks: 'Instance/cluster status, storage %, multi-AZ, backup retention drift' },
  { name: 'EBSVolumes', checks: 'Orphan/unattached volumes, snapshot age' },
  { name: 'EKSControlPlane', checks: 'Version skew vs node groups, addon staleness' },
  { name: 'EKSNodeGroups', checks: 'Capacity, scaling activity, version drift' },
  { name: 'IAMRoles', checks: 'Trust policy drift on cluster service-account roles' },
  { name: 'ALBTargetHealth', checks: 'Unhealthy targets in Load Balancer Controller-managed target groups' },
  { name: 'ACMCertExpiry', checks: 'Certs expiring within 14 days' },
  { name: 'KMSKeys', checks: 'Pending-deletion KMS keys still referenced by cluster resources' },
  { name: 'S3BucketPublicAccess', checks: 'Public-ACL drift on buckets referenced by cluster IAM' },
  { name: 'VPCSubnets', checks: 'Exhausted IP space affecting pod CIDR allocation' },
];

const gcp = [
  { name: 'CloudSQL', checks: 'Instance status, storage utilization via Cloud Monitoring API' },
  { name: 'GKE', checks: 'Node pool version drift, cluster status' },
  { name: 'IAMServiceAccounts', checks: 'Workload Identity binding drift' },
  { name: 'Subnets', checks: 'IP utilization' },
  { name: 'LoadBalancer', checks: 'Backend health, cert expiry' },
  { name: 'GCSAndKMS', checks: 'Bucket/key policy drift' },
  { name: 'PersistentDisk', checks: 'Disk health and attachment status' },
];

const azure = [
  { name: 'SQLDatabase', checks: 'Instance status, storage_percent (live Azure Monitor)' },
  { name: 'AKS', checks: 'Node pool status, version drift' },
  { name: 'Identity', checks: 'AAD Workload Identity binding drift' },
  { name: 'Subnet', checks: 'Live IP-pool count' },
  { name: 'AppGateway', checks: 'Live BackendHealth LRO' },
  { name: 'KeyVault', checks: 'Key/secret expiry' },
  { name: 'Storage', checks: 'Access policy drift' },
  { name: 'Disk', checks: 'Disk health and attachment' },
];

const cloudRows = [
  { provider: 'AWS', count: '10', enable: 'cloudProbes.aws.enabled: true', auth: 'IRSA (no long-lived keys)' },
  { provider: 'GCP', count: '7', enable: 'cloudProbes.gcp.enabled: true', auth: 'GCP Workload Identity' },
  { provider: 'Azure', count: '8', enable: 'cloudProbes.azure.enabled: true', auth: 'AAD Workload Identity' },
];
---

<DocsLayout
  title="CHA &mdash; Cloud Probes"
  description="25 cloud probe families across AWS, GCP, and Azure. Workload-identity auth only. Enable per-provider in Helm values."
  topic="Cloud Probes"
>
  <PageHero
    eyebrow="Docs"
    title="Cloud Probes"
    subtitle="25 probe families across AWS, GCP, and Azure. Workload-identity auth only — no long-lived credentials. All off by default; enable per-provider."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Cloud probes run alongside the K8s probes on every cycle. They use the same workload-identity credentials your cluster already has — IRSA on EKS, GCP Workload Identity on GKE, AAD Workload Identity on AKS. No cloud credentials are stored in CHA.
      </p>

      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Provider</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Probes</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Enable (Helm)</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Auth</th>
            </tr>
          </thead>
          <tbody>
            {cloudRows.map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-semibold text-zinc-900 dark:text-zinc-100">{r.provider}</td>
                <td class="py-3 pr-6 text-zinc-600 dark:text-zinc-400">{r.count}</td>
                <td class="py-3 pr-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.enable}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.auth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          Cloud probes are <strong>off by default</strong>. Enable with <code class="font-mono">--set cloudProbes.aws.enabled=true</code> (or the equivalent for GCP/Azure). The K8s-only value is unchanged if you never enable cloud probes.
        </p>
      </div>
    </div>

    {[
      { title: 'AWS probes (10)', probes: aws, bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40' },
      { title: 'GCP probes (7)', probes: gcp, bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40' },
      { title: 'Azure probes (8)', probes: azure, bg: 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40' },
    ].map((section) => (
      <div>
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{section.title}</h2>
        <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
        <div class="mt-6 overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800">
                <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Probe</th>
                <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">What it checks</th>
              </tr>
            </thead>
            <tbody>
              {section.probes.map((p) => (
                <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</td>
                  <td class="py-3 text-zinc-600 dark:text-zinc-400">{p.checks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/cloud-probes.astro
git commit -m "feat(docs): add Cloud Probes reference page"
```

---

## Task 7: Analyzers Page

**Files:**
- Create: `src/pages/docs/analyzers.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const diagnostic = [
  { name: 'SecretKeyMissing', detects: 'Pod in CreateContainerConfigError — names the missing key, consuming Deployment, and owning ExternalSecret', severity: 'Critical' },
  { name: 'FailingExternalSecrets', detects: 'ExternalSecret with Ready=False — surfaces the controller error message including the specific missing Vault property', severity: 'Warning' },
  { name: 'ProactiveSecretKeyCheck', detects: 'Workload env references to Secret keys that don\'t exist yet — fires before the pod crashes', severity: 'Warning' },
  { name: 'UnprovisionedSecret', detects: 'Workload references a Secret with no ExternalSecret provisioning it', severity: 'Warning' },
  { name: 'ImagePullAuth', detects: 'Pod in ImagePullBackOff with kubelet auth-failure signals (401, denied, unauthorized)', severity: 'Critical' },
  { name: 'CertExpiry', detects: 'cert-manager Certificate not Ready, expiring within 14 days, or already expired', severity: 'Critical / Warning' },
  { name: 'TLSSecretMismatch', detects: 'Ingress points at an expired Secret while cert-manager renews into a different Secret (two-Secret naming drift)', severity: 'Warning' },
  { name: 'VaultPathMissing', detects: 'Queries Vault directly to catch drift before ESO\'s next refresh. Apache-2.0; you provide the Vault client. Paid tier auto-wires from your Vault config.', severity: 'Warning' },
  { name: 'DNSChainDrift', detects: 'Cloudflare DNS → cluster ingress LB → Ingress host → Service → ready Endpoints. Emits the highest broken layer per host', severity: 'Warning' },
];

const drift = [
  { name: 'GitOpsDrift', detects: 'Resources that have drifted from their GitOps-managed desired state' },
  { name: 'WorkloadStateDrift', detects: 'Deployment/StatefulSet replica count vs desired' },
  { name: 'RBACDrift', detects: 'ClusterRoleBinding/RoleBinding changes not reflected in expected state' },
  { name: 'ConfigDrift', detects: 'ConfigMap or Secret content changed outside GitOps' },
  { name: 'CapacityDrift', detects: 'Resource request/limit ratios that have drifted from baseline' },
  { name: 'SecurityDrift', detects: 'Pod SecurityContext changes — privilege escalation, host network, host PID' },
];

const workload = [
  { name: 'DisruptionDrift', detects: 'PDB blocks all evictions / stuck Indexed-Job failed indexes / ResourceQuota at 100% past 1h' },
  { name: 'OOMKillRecurrence', detects: 'Pod with ≥3 OOMKilled restarts in 24h — signals a persistent memory sizing issue' },
  { name: 'PVOrphan', detects: 'PersistentVolume Released >7 days — still billing on the underlying cloud disk' },
  { name: 'CronJobStuck', detects: 'Warning: >24h since last success. Critical: never succeeded or suspended unexpectedly' },
];

const paid = [
  { name: 'VaultPathDriftPro', detects: 'Extended Vault path analysis with auto-wired client and cross-namespace drift' },
  { name: 'CertificateChainAnomaly', detects: 'Full cert chain validation including intermediate CAs and trust anchors' },
  { name: 'MultiClusterDrift', detects: 'Cross-cluster state divergence across federated or ArgoCD-managed clusters' },
  { name: 'StatefulSetReplicaPressure', detects: 'StatefulSet rolling-update stalls and replica pressure patterns' },
];
---

<DocsLayout
  title="CHA &mdash; Analyzers"
  description="19 OSS analyzers run after every probe cycle — diagnostic, drift-class, log/workload. 4 additional analyzers in the paid tier."
  topic="Analyzers"
>
  <PageHero
    eyebrow="Docs"
    title="Analyzers"
    subtitle="Analyzers run after every probe cycle. All are read-only. Findings attach to DriftReport CRs and route to Slack, Alertmanager, and ticketing sinks."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Analyzers inspect the raw Kubernetes API state — they don't call external services unless an integration is configured. Each analyzer emits a finding with a severity, a human-readable summary, and actionable remediation hints.
      </p>
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          <strong>Disable any analyzer</strong> with <code class="font-mono">CHA_ANALYZER_NAME=off</code> or the per-analyzer Helm toggle (<code class="font-mono">analyzers.name.enabled: false</code>).
        </p>
      </div>
    </div>

    {[
      { title: 'Diagnostic analyzers (9)', rows: diagnostic, cols: ['Analyzer', 'What it detects', 'Severity'], showSeverity: true },
    ].map((s) => (
      <div>
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{s.title}</h2>
        <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
        <div class="mt-6 overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800">
                <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Analyzer</th>
                <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">What it detects</th>
                <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Severity</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{r.name}</td>
                  <td class="py-3 pr-6 text-zinc-600 dark:text-zinc-400">{r.detects}</td>
                  <td class="py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Drift-class analyzers (6)</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Analyzer</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">What it detects</th>
            </tr>
          </thead>
          <tbody>
            {drift.map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{r.name}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.detects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Log / workload analyzers (4)</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Analyzer</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">What it detects</th>
            </tr>
          </thead>
          <tbody>
            {workload.map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{r.name}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.detects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Paid-tier analyzers (4)</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        The <code class="font-mono">cha-com</code> paid binary adds four additional analyzers. They use the same <code class="font-mono">pkg/registry</code> interface as OSS analyzers and respect the same per-analyzer Helm toggles.
      </p>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Analyzer</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">What it detects</th>
            </tr>
          </thead>
          <tbody>
            {paid.map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{r.name}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.detects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/analyzers.astro
git commit -m "feat(docs): add Analyzers reference page"
```

---

## Task 8: Fixers Page

**Files:**
- Create: `src/pages/docs/fixers.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const fixers = [
  {
    name: 'StaleErrorPods',
    fixes: 'Error/Failed pods owned by a Job or unowned (debug leftovers)',
    optIn: false,
    helm: 'fixers.staleErrorPods.enabled',
  },
  {
    name: 'StuckJobsWithBadSecretRef',
    fixes: 'Frozen Jobs whose pod template references a renamed Secret key — deletes the Job so the CronJob respawns clean',
    optIn: false,
    helm: 'fixers.stuckJobs.enabled',
  },
  {
    name: 'StuckRSPods',
    fixes: 'ReplicaSet pods stuck on a stale revision when the Deployment has rolled forward (rollout restart)',
    optIn: false,
    helm: 'fixers.stuckRS.enabled',
  },
  {
    name: 'StuckCertificateRequests',
    fixes: 'cert-manager CRs in terminal Ready=False/Failed — deletion lets cert-manager re-issue',
    optIn: false,
    helm: 'fixers.stuckCertReqs.enabled',
  },
  {
    name: 'TLSSecretMismatch',
    fixes: 'Repoints Ingress.spec.tls[].secretName to the cert-manager-managed Secret. Skips GitOps-managed Ingresses.',
    optIn: true,
    helm: 'fixers.tlsSecretMismatch.enabled',
  },
];
---

<DocsLayout
  title="CHA &mdash; Fixers"
  description="5 policy-bounded auto-fixers. Each is opt-in, safety-gated, idempotent, and re-verified after every run."
  topic="Fixers"
>
  <PageHero
    eyebrow="Docs"
    title="Fixers"
    subtitle="5 policy-bounded auto-fixers. All are opt-in, safety-gated, and re-verified after every run. Nothing mutates silently."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Fixers are the remediation layer. Each fixer targets exactly one named failure class, runs only when its corresponding analyzer fires, and re-runs the analyzer afterward to confirm resolution. Fixers never edit Secrets, ConfigMaps, or generic CRDs — those changes require a human and a git commit.
      </p>
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          <strong>Remediation is off by default.</strong> Enable it in Helm values with <code class="font-mono">remediation.enabled: true</code>, then enable each fixer individually.
        </p>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Fixer reference</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Fixer</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">What it fixes</th>
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Helm flag</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Opt-in</th>
            </tr>
          </thead>
          <tbody>
            {fixers.map((f) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</td>
                <td class="py-3 pr-6 text-zinc-600 dark:text-zinc-400">{f.fixes}</td>
                <td class="py-3 pr-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">{f.helm}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{f.optIn ? 'Yes (off by default)' : 'No (on when remediation.enabled)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Safety gates</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Every fixer checks these gates before running. If any gate blocks, the finding is reported but no mutation occurs.</p>
      <ul class="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <li class="flex gap-2"><span class="text-accent-500">→</span><span><strong>GitOps guard</strong> — skips resources managed by ArgoCD, Flux, or Helm (detected via standard labels). A fixer won't fight a reconciler.</span></li>
        <li class="flex gap-2"><span class="text-accent-500">→</span><span><strong>Paused/suspended guard</strong> — skips Deployments with <code class="font-mono">spec.paused: true</code> and CronJobs with <code class="font-mono">spec.suspend: true</code>.</span></li>
        <li class="flex gap-2"><span class="text-accent-500">→</span><span><strong>cert-manager health guard</strong> — StuckCertificateRequests fixer checks that the parent Certificate is healthy before deleting the failed CR.</span></li>
        <li class="flex gap-2"><span class="text-accent-500">→</span><span><strong>Protected namespace list</strong> — never mutates resources in protected namespaces (default: kube-system, kube-public, cert-manager). Configurable via <code class="font-mono">protectedNamespaces</code>.</span></li>
      </ul>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dry-run mode</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Pass <code class="font-mono">--dry-run</code> (or <code class="font-mono">watcher.dryRun: true</code> in Helm values) to log every fix CHA would apply without applying it. The fix log is identical to production mode minus the actual mutation. Use this in your eval cycle before enabling fixers.
      </p>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Re-verify loop</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        After every fix, CHA re-runs the analyzer for the fixed subject. If the finding persists, the action is recorded as <code class="font-mono">unresolved</code> in the DriftReport — not silently closed. The loop is: <code class="font-mono">diagnose → fix → re-diagnose → resolve</code>.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`DriftReport  StaleErrorPod    — fixer ran        OK
DriftReport  StuckJob         — fixer ran        OK
DriftReport  TLSSecretMismatch — fixer ran       OK
Re-verify in 60s ...
→ All cleared`}</code></pre>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/fixers.astro
git commit -m "feat(docs): add Fixers reference page"
```

---

## Task 9: AI Tiers Page

**Files:**
- Create: `src/pages/docs/ai-tiers.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const tiers = [
  {
    tier: 'T0',
    name: 'Diagnostic narrative',
    does: 'Enriches every DriftReport finding with an LLM-generated narrative summary — what happened, why it matters, and the most likely root cause. Read-only; no action proposed.',
    approval: 'None',
  },
  {
    tier: 'T1',
    name: 'Fix proposals',
    does: 'Proposes a specific action (bounded to the operator-defined action_kind policy) and delivers a signed click-to-fix URL to Slack or the ticket. Nothing mutates until the URL is clicked.',
    approval: 'One-click signed URL',
  },
  {
    tier: 'T2',
    name: 'Multi-step planner',
    does: 'For complex findings, proposes a plan of up to 5 prerequisite-linked steps. Each step requires its own approval click. Steps are linked — later steps can reference earlier results.',
    approval: 'Per-step signed URL',
  },
  {
    tier: 'T3',
    name: 'Vault runbook proposer',
    does: 'Proposes break-glass Vault runbooks for Vault-related outages. Delivered as a structured document, never auto-run. Requires dual approval before any Vault path is touched.',
    approval: 'Dual approval',
  },
];
---

<DocsLayout
  title="CHA &mdash; AI Tiers"
  description="T0 narration, T1 fix proposals, T2 multi-step planning, T3 Vault runbooks — all approval-gated and bounded by operator policy."
  topic="AI Tiers"
>
  <PageHero
    eyebrow="Docs"
    title="AI Tiers"
    subtitle="Four LLM-augmented capabilities, each approval-gated. Available in the paid cha-com binary — same policy bounds and RBAC ceiling as the OSS engine."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        The paid <code class="font-mono">cha-com</code> binary runs alongside the OSS watcher — it never replaces it. AI tiers add an LLM layer on top of OSS findings. The architectural invariant: the paid binary cannot exceed the OSS RBAC ceiling. Every mutation flows through the same <code class="font-mono">snapshot.Mutator</code> interface and the operator-defined action policy.
      </p>
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="text-sm text-amber-800 dark:text-amber-300">
          <strong>Nothing mutates without a human click.</strong> T1 and above require an approval action — a signed URL delivered to Slack or your ticket. Without the click, no cluster state changes.
        </p>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tier reference</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 space-y-4">
        {tiers.map((t) => (
          <div class="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-3">
                  <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-xs font-bold text-white">{t.tier}</span>
                  <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</h3>
                </div>
                <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t.does}</p>
              </div>
              <div class="shrink-0 text-right">
                <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Approval</span>
                <p class="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.approval}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Enabling AI tiers</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        AI tiers are additive — the same Helm chart, plus <code class="font-mono">ai.enabled=true</code>. The OSS watcher workloads are untouched.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`helm upgrade cha cha/cluster-health-autopilot --reuse-values \\
  --set ai.enabled=true \\
  --set ai.tier=t1 \\
  --set ai.endpoint=https://your-llm-endpoint/v1 \\
  --set ai.model=your-model-name \\
  --set ai.apiKey.secretName=cha-ai-llm-key`}</code></pre>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Bring your own LLM</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        CHA-com uses any OpenAI-compatible endpoint — your in-cluster vLLM instance, Azure OpenAI, or any other gateway. Cluster diagnostics and prompts never leave your perimeter when using an in-cluster LLM. Set <code class="font-mono">ai.endpoint</code> to the <code class="font-mono">/v1</code> base URL of your endpoint.
      </p>
      <div class="mt-4 rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <p class="text-sm text-zinc-700 dark:text-zinc-300">
          <strong>Recommended:</strong> run an in-cluster vLLM instance (e.g. Qwen or Llama) behind a ClusterIP service. Set <code class="font-mono">ai.allowSaas=false</code> to block any external LLM calls. Cluster data never crosses the cluster boundary.
        </p>
      </div>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/ai-tiers.astro
git commit -m "feat(docs): add AI Tiers page (capabilities only)"
```

---

## Task 10: Helm Reference Page

**Files:**
- Create: `src/pages/docs/helm-reference.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const groups = [
  {
    title: 'Core workloads',
    rows: [
      { key: 'watcher.enabled', default: 'true', desc: 'Enable the event-driven watcher Deployment' },
      { key: 'watcher.interval', default: '300', desc: 'Seconds between CronJob resync cycles' },
      { key: 'watcher.dryRun', default: 'false', desc: 'Log fixes without applying them' },
      { key: 'remediation.enabled', default: 'false', desc: 'Master switch — must be true for any fixer to run' },
      { key: 'protectedNamespaces', default: '[kube-system, kube-public, cert-manager]', desc: 'Namespaces fixers will never mutate' },
    ],
  },
  {
    title: 'Cloud probes',
    rows: [
      { key: 'cloudProbes.aws.enabled', default: 'false', desc: 'Enable all 10 AWS probes (IRSA auth)' },
      { key: 'cloudProbes.gcp.enabled', default: 'false', desc: 'Enable all 7 GCP probes (Workload Identity)' },
      { key: 'cloudProbes.azure.enabled', default: 'false', desc: 'Enable all 8 Azure probes (AAD Workload Identity)' },
    ],
  },
  {
    title: 'Individual probe toggles',
    rows: [
      { key: 'probes.ceph.enabled', default: 'true', desc: 'Ceph storage probe' },
      { key: 'probes.postgres.enabled', default: 'true', desc: 'PostgreSQL probe' },
      { key: 'probes.nodes.enabled', default: 'true', desc: 'Cluster Nodes probe' },
      { key: 'probes.pvcs.enabled', default: 'true', desc: 'PVC binding probe' },
      { key: 'probes.endpoints.enabled', default: 'true', desc: 'External endpoints probe' },
      { key: 'probes.crashLoop.enabled', default: 'true', desc: 'CrashLoopBackOff probe' },
      { key: 'probes.kongRoutes.enabled', default: 'true', desc: 'Kong route health probe (auto-skips if Kong CRDs absent)' },
      { key: 'probes.gpuNodes.enabled', default: 'true', desc: 'GPU node allocatability probe (auto-skips if no GPU nodes)' },
    ],
  },
  {
    title: 'Fixers',
    rows: [
      { key: 'fixers.staleErrorPods.enabled', default: 'true', desc: 'Delete Error/Failed pods (requires remediation.enabled)' },
      { key: 'fixers.stuckJobs.enabled', default: 'true', desc: 'Restart frozen Jobs with bad SecretRef' },
      { key: 'fixers.stuckRS.enabled', default: 'true', desc: 'Rollout-restart stale ReplicaSet pods' },
      { key: 'fixers.stuckCertReqs.enabled', default: 'true', desc: 'Delete terminal cert-manager CertificateRequests' },
      { key: 'fixers.tlsSecretMismatch.enabled', default: 'false', desc: 'Repoint Ingress to correct TLS Secret (opt-in)' },
    ],
  },
  {
    title: 'Alerting and ticketing',
    rows: [
      { key: 'slackWebhookSecretName', default: '""', desc: 'K8s Secret name containing Slack webhook URL(s)' },
      { key: 'alertmanager.enabled', default: 'false', desc: 'Enable Alertmanager alert sink' },
      { key: 'alertmanager.url', default: '""', desc: 'Alertmanager URL (e.g. http://alertmanager:9093)' },
      { key: 'ticketing.openproject.enabled', default: 'false', desc: 'Enable OpenProject MCP ticketing sink (OSS)' },
      { key: 'ticketing.jira.enabled', default: 'false', desc: 'Enable Jira ticketing sink (paid)' },
    ],
  },
  {
    title: 'AI tiers (paid)',
    rows: [
      { key: 'ai.enabled', default: 'false', desc: 'Enable the cha-com aiwatch Deployment' },
      { key: 'ai.tier', default: 't0', desc: 'AI tier: t0 | t1 | t2 | t3' },
      { key: 'ai.endpoint', default: '""', desc: 'OpenAI-compatible LLM base URL (e.g. https://host/v1)' },
      { key: 'ai.model', default: '""', desc: 'Model name to use (passed as model in API requests)' },
      { key: 'ai.apiKey.secretName', default: '""', desc: 'K8s Secret containing the LLM API key' },
      { key: 'ai.allowSaas', default: 'false', desc: 'Allow external (non-cluster) LLM endpoints' },
      { key: 'approval.enabled', default: 'false', desc: 'Enable approval-server (required for T1+)' },
    ],
  },
];
---

<DocsLayout
  title="CHA &mdash; Helm Reference"
  description="Key Helm values.yaml options for Cluster Health Autopilot, grouped by feature area."
  topic="Helm Reference"
>
  <PageHero
    eyebrow="Docs"
    title="Helm Reference"
    subtitle="Key values.yaml options grouped by feature area. Full chart source at charts/cluster-health-autopilot/ in the GitHub repo."
  />

  <section class="mx-auto max-w-5xl space-y-14 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Install with defaults first — most options have safe defaults. Add cloud probes, ticketing, and AI tiers incrementally as you need them. The full values file is at{' '}
        <a
          href="https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/blob/main/charts/cluster-health-autopilot/values.yaml"
          class="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          target="_blank"
          rel="noopener"
        >
          charts/cluster-health-autopilot/values.yaml
        </a>.
      </p>
    </div>

    {groups.map((g) => (
      <div>
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{g.title}</h2>
        <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
        <div class="mt-6 overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800">
                <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Key</th>
                <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Default</th>
                <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td class="py-3 pr-6 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">{r.key}</td>
                  <td class="py-3 pr-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.default}</td>
                  <td class="py-3 text-zinc-600 dark:text-zinc-400">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/helm-reference.astro
git commit -m "feat(docs): add Helm Reference page"
```

---

## Task 11: DriftReport CRD Page

**Files:**
- Create: `src/pages/docs/driftreport.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';

const statusValues = [
  { value: 'open', desc: 'Finding detected; no fix attempted or fix unresolved' },
  { value: 'resolved', desc: 'Fix applied and re-verify passed' },
  { value: 'suppressed', desc: 'Finding silenced by operator policy (paid tier)' },
];

const specFields = [
  { field: 'subject.kind', desc: 'Kubernetes Kind of the affected resource (e.g. Pod, Deployment)' },
  { field: 'subject.name', desc: 'Name of the affected resource' },
  { field: 'subject.namespace', desc: 'Namespace of the affected resource' },
  { field: 'analyzer', desc: 'Name of the analyzer that produced this finding' },
  { field: 'severity', desc: 'Critical | Warning | Info' },
  { field: 'summary', desc: 'Human-readable one-line finding description' },
  { field: 'remediationHint', desc: 'Actionable suggestion for manual remediation' },
  { field: 'fixerApplied', desc: 'Name of the fixer that ran (if any)' },
  { field: 'detectedAt', desc: 'RFC3339 timestamp of first detection' },
  { field: 'resolvedAt', desc: 'RFC3339 timestamp of resolution (if resolved)' },
];
---

<DocsLayout
  title="CHA &mdash; DriftReport CRD"
  description="DriftReport is the kubectl-queryable representation of CHA findings. Every detected issue creates or updates a DriftReport CR."
  topic="DriftReport CRD"
>
  <PageHero
    eyebrow="Docs"
    title="DriftReport CRD"
    subtitle="Every CHA finding creates or updates a DriftReport custom resource. kubectl get driftreports -A is your cluster's real-time drift state."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <div>
      <p class="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        DriftReports are first-class Kubernetes objects. They persist in etcd, appear in <code class="font-mono">kubectl get</code>, work with OPA admission policies, and can be read by ArgoCD ApplicationSet generators and other tooling. CHA creates one DriftReport per finding per subject — re-detecting the same issue updates the existing CR rather than creating a new one.
      </p>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Spec fields</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Field</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {specFields.map((f) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">{f.field}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Status values</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800">
              <th class="py-2 pr-6 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th class="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {statusValues.map((s) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-800/60">
                <td class="py-3 pr-6 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{s.value}</td>
                <td class="py-3 text-zinc-600 dark:text-zinc-400">{s.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">kubectl examples</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# List all findings across all namespaces
kubectl get driftreports -A

# Wide output with kind and status
kubectl get driftreports -A -o wide

# Filter by status
kubectl get driftreports -A --field-selector status.state=open

# Describe a specific finding
kubectl describe driftreport drift-tls-secret-1 -n default

# Watch for new findings in real time
kubectl get driftreports -A -w`}</code></pre>
    </div>

    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Using DriftReports in GitOps</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        DriftReports are standard Kubernetes CRs. You can reference them in OPA/Gatekeeper constraints (block deploys to namespaces with open Critical findings), ArgoCD ApplicationSet generators (exclude clusters with drift), or your own controllers via a standard informer on the <code class="font-mono">driftreports.cha.bionicaisolutions.com</code> GVR.
      </p>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/driftreport.astro
git commit -m "feat(docs): add DriftReport CRD page"
```

---

## Task 12: Integrations Page

**Files:**
- Create: `src/pages/docs/integrations.astro`

- [ ] **Step 1: Create the file**

```astro
---
import DocsLayout from '../../layouts/DocsLayout.astro';
import PageHero from '../../components/PageHero.astro';
---

<DocsLayout
  title="CHA &mdash; Integrations"
  description="Slack 3-channel routing, Alertmanager, OpenProject, Jira, ServiceNow, Prometheus metrics, and webhook triggers."
  topic="Integrations"
>
  <PageHero
    eyebrow="Docs"
    title="Integrations"
    subtitle="Route findings to Slack, Alertmanager, and ticketing systems. Trigger cycles from Prometheus alerts or external webhooks."
  />

  <section class="mx-auto max-w-5xl space-y-16 px-6 py-16">

    <!-- Slack -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Slack</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        CHA routes to three Slack channels — critical, warning, and info — using separate Kubernetes Secrets. Create the Secrets before installing (or provision via ESO):
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`kubectl create secret generic cha-slack-critical \\
  --from-literal=webhookUrl=https://hooks.slack.com/... \\
  -n cluster-health-autopilot

kubectl create secret generic cha-slack-warning \\
  --from-literal=webhookUrl=https://hooks.slack.com/... \\
  -n cluster-health-autopilot

kubectl create secret generic cha-slack-info \\
  --from-literal=webhookUrl=https://hooks.slack.com/... \\
  -n cluster-health-autopilot`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Then set the secret names in Helm values:
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`--set slackCriticalSecretName=cha-slack-critical \\
--set slackWarningSecretName=cha-slack-warning \\
--set slackInfoSecretName=cha-slack-info`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Repeated alerts are deduplicated — configure the repeat interval per severity with <code class="font-mono">watcher.slackCriticalRepeatInterval</code> (seconds, default 3600).
      </p>
    </div>

    <!-- Alertmanager -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Alertmanager</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        CHA can post findings as Alertmanager alerts and poll Alertmanager for firing alerts to trigger probe cycles (trigger class C).
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# Enable Alertmanager sink
--set alertmanager.enabled=true \\
--set alertmanager.url=http://kube-prometheus-stack-alertmanager:9093

# Enable polling (trigger class C) — fires a diagnose cycle on new alerts
--set triggers.alertmanager.enabled=true`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Each fired alert carries <code class="font-mono">cha_severity</code>, <code class="font-mono">cha_analyzer</code>, and <code class="font-mono">cha_subject</code> labels for routing in Alertmanager rules.
      </p>
    </div>

    <!-- Ticketing -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Ticketing</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <div class="mt-4 space-y-4">
        <div class="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-50">OpenProject</h3>
            <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">OSS</span>
          </div>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            MCP-based ticketing sink. CHA upserts one ticket per open DriftReport — re-detecting the same issue updates the existing ticket rather than creating a duplicate. Enable with <code class="font-mono">ticketing.openproject.enabled=true</code> and provide the OpenProject API credentials via a K8s Secret.
          </p>
        </div>
        <div class="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-50">Jira &amp; ServiceNow</h3>
            <span class="rounded-full border border-accent-200 bg-accent-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/40 dark:text-accent-300">Paid</span>
          </div>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Jira and ServiceNow ticketing sinks are available in the paid Enterprise tier. Contact <a href="/pricing/" class="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300">sales</a> for access.
          </p>
        </div>
      </div>
    </div>

    <!-- Prometheus -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Prometheus metrics</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        The paid <code class="font-mono">cha-com</code> aiwatch Deployment exposes <code class="font-mono">cha_*</code> metric families on <code class="font-mono">/metrics:9090</code>. The Helm chart renders a ServiceMonitor and PrometheusRule when <code class="font-mono">ai.metrics.enabled=true</code>. Key metrics: <code class="font-mono">cha_findings_total</code>, <code class="font-mono">cha_fixes_total</code>, <code class="font-mono">cha_breaker_open</code>, <code class="font-mono">cha_autonomy_rejections_total</code>.
      </p>
    </div>

    <!-- Webhook triggers -->
    <div>
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Webhook triggers (class E)</h2>
      <div class="mt-1 h-0.5 w-8 rounded-full bg-accent-500"></div>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        External services can trigger an immediate diagnose cycle by posting an HMAC-SHA256-authenticated request. Useful for integrating with Vault, ArgoCD, cert-manager, or Cloudflare change events.
      </p>
      <pre class="mt-4 overflow-x-auto rounded-lg bg-zinc-900 px-5 py-4 text-sm text-zinc-100 dark:bg-zinc-950"><code>{`# Example: trigger on a Vault seal event
curl -X POST https://cha-watcher.cluster/webhook/vault \\
  -H "X-CHA-Signature: $(cha sign --secret $HMAC_SECRET --body '{}')" \\
  -H "Content-Type: application/json" \\
  -d '{}'`}</code></pre>
      <p class="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Enable webhook triggers with <code class="font-mono">triggers.webhook.enabled=true</code>. The HMAC secret is provisioned via a K8s Secret and referenced by <code class="font-mono">triggers.webhook.secretName</code>.
      </p>
    </div>

  </section>
</DocsLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/pages/docs/integrations.astro
git commit -m "feat(docs): add Integrations page"
```

---

## Task 13: Final Verification

**Files:** none

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: `Complete!` with no errors or warnings about missing pages.

- [ ] **Step 2: Confirm all 9 card links resolve**

Check `dist/docs/` for the expected directories:

```bash
ls dist/docs/
# Expected: index.html  quick-start/  k8s-probes/  cloud-probes/  analyzers/
#           fixers/  ai-tiers/  helm-reference/  driftreport/  integrations/
```

- [ ] **Step 3: Confirm breadcrumbs render on topic pages**

```bash
grep -l "← Back to docs" dist/docs/k8s-probes/index.html
# Expected: dist/docs/k8s-probes/index.html
```

- [ ] **Step 4: Start dev server and spot-check in browser**

```bash
npm run dev
# Open http://localhost:4321/docs/
# Verify: card grid loads, click "K8s Probes", breadcrumb shows "Docs / K8s Probes", "← Back to docs" appears
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(docs): final build verification pass"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 9 topic cards + landing + DocsLayout covered. `.gitignore` update included.
- [x] **No placeholders**: Every file has complete Astro code. No "TBD" or "fill in details".
- [x] **Type consistency**: `DocsLayout` props (`title: string, description?: string, topic: string`) used identically across all 9 topic pages. `badgeStyles` Record typed correctly in landing page.
- [x] **Build command**: `npm run build` specified for every task.
- [x] **Paid content scoped**: AI tiers page covers T0–T3 capabilities only. No Phase 2/3 internals, RAG architecture, Ed25519 details, or audit-bundle format.
