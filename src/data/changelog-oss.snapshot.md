<!-- DO NOT EDIT — vendored snapshot of CHANGELOG.md (Bionic-AI-Solutions/cluster-health-autopilot) -->
<!-- source: CHANGELOG.md (Bionic-AI-Solutions/cluster-health-autopilot) -->
<!-- synced: 2026-06-11 -->
<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->
<!-- truncated to newest 12 release sections; the public roadmap renders these only -->

## [1.25.1] — 2026-06-11

### Fixed — goreleaser disk-OOM on GH-hosted runner

v1.25.0 goreleaser failed at the docker buildx multi-arch build stage with `no space left on device`. The OSS workflow's transitive deps (AWS SDK v2 + k8s.io + buildx cache) overshoot the ~14 GiB free disk on the GH-hosted runner. v1.24.x and earlier just happened to fit; v1.25.0's added KEDA + extra ownerRef walker pushed past the limit.

Same fix that the CHA-com workflow shipped in v1.20.0: pre-checkout cleanup step removes ~25 GiB of preinstalled .NET / Android SDK / Haskell / Swift / CodeQL toolchains that the workflow doesn't use.

Chart 1.25.0 was published successfully to gh-pages before goreleaser exited; this patch re-publishes the chart at 1.25.1 alongside the new image so operators always pull a coherent pair. No code changes — v1.25.0 and v1.25.1 ship byte-identical Go binaries.

### Added — `spec.remediate.activeDeadlineSeconds`

The diagnose CronJob already had `spec.diagnose.activeDeadlineSeconds` (default 300s). The remediate counterpart was hardcoded at 120s in the operator builder. Busy clusters with many SecurityDrift proposals + DigestPin candidates queued up routinely overshoot 120s and hit BackoffLimitExceeded. Live observation on the dev cluster (2026-06-11): 4 of 4 most-recent runs had `cond: Failed=True reason=BackoffLimitExceeded`.

Operators can now set `spec.remediate.activeDeadlineSeconds: 900` (or whatever their workload needs). Default 120s preserved for low-finding clusters where it's fine.

## [1.25.0] — 2026-06-11 — 2026-06-11

Two follow-ups after live deployment surfaced operator-managed gaps + Slack-flood symptoms.

### Added — Per-workload dedup in SecurityDrift digest-pin findings

Before v1.25.0 the SecurityDrift `checkMutableImageTags` analyzer emitted one Diagnostic per Pod. A 3-replica Deployment + 9-DaemonSet-Pod calico-node → 12 Slack alerts every cycle, each identical except for the Pod-name suffix. v1.25.0 collapses by `(namespace, controller-owner-name, sorted-unpinned-image-set)`:

- 3 Pods of one ReplicaSet → 1 diagnostic, `Subject="Workload/ns/rs-name"`, message says "(across 3 replica pods)"
- Different image versions during a rolling update → 2 diagnostics (one per RS), correctly distinct
- Standalone Pods (no controller) → fall back to per-Pod identity so they still surface
- Severity is the union: any one warning-class image in the group upgrades the whole group

2 new tests cover dedup + rolling-update distinctness. Existing SecurityDrift tests still pass with the new Subject shape.

### Added — Operator-managed workloads synthesize `owner_chart`

The workload-feeder previously read `owner_chart` only from Helm release labels (`helm.sh/chart` + `meta.helm.sh/release-name`) + ArgoCD `instance` annotation. Operator-managed Deployments (created directly by a Custom Resource controller, no Helm labels) had `owner_chart=None` in RAG → the DigestPinProposer couldn't find a `values.yaml` to target → silently skipped → no PR opened → no Approve/Reject buttons in Slack.

v1.25.0 walks the OwnerReferences chain and synthesizes:

- `owner_kind = "Operator"`
- `owner_chart = "<crkind-lowercase>-<crname>"` (e.g. `clusterhealthautopilot-bionic`)
- `owner_release = <CR name>`
- `owner_release_namespace = workload namespace`

Built-in workload parents (apps/v1 ReplicaSet, batch/v1 Job, core/v1) are explicitly skipped — they mean "this Pod is owned by a Deployment", not "this Deployment is operator-managed". 2 new tests cover both the positive (operator CR owner → synthesized) and negative (apps ReplicaSet owner → still nil) cases.

`detectOwner` no longer early-returns on nil annotations — operator-managed workloads typically have NO annotations at all, so the nil-anns path must still walk the OwnerReferences fallback.

## [1.24.1] — 2026-06-10 — 2026-06-10

### Fixed — CRD schema for `spec.watcher.triggers` (v1.24.0 was unusable on schema-strict K8s)

v1.24.0 added the Go types + operator reconciler for `spec.watcher.triggers.{prom,webhook}` but did NOT update the CRD's OpenAPIv3 schema. K8s 1.27+ structural-schema pruning stripped the field at the API server, so any `kubectl apply` of a CR with `triggers` set silently dropped the data. The operator then rendered the watcher Deployment with no trigger args.

This patch adds the matching schema to both `bundle/manifests/cha.bionicaisolutions.com_clusterhealthautopilots.yaml` and `charts/cluster-health-autopilot/templates/crd-clusterhealthautopilot.yaml`. Verified live: `kubectl explain clusterhealthautopilots.spec.watcher.triggers` now resolves and the field persists on `kubectl get`.

Caught during live activation of M5 on the dev cluster (kubectl apply succeeded with a warning, but the field was stripped silently — operator rendered no trigger args).

## [1.24.0] — 2026-06-10 — 2026-06-10

Adversarial-review follow-up: operator-CR triggers + KEDA expansion.

### Added — `spec.watcher.triggers.{prom,webhook}` typed CR fields

The chart's v1.23.1 `watcher.triggers.*` values knobs activated M5/M6 for chart-managed installs, but operator-managed (ArgoCD/Flux/kubectl-apply) installs couldn't reach them from the CR — they had to thread Helm values around. This release adds the typed surface:

- `WatcherTriggersSpec.Prom {URL, Interval, AlertNameFilter}` → renders `--prom-trigger-url/interval/alert-filter`
- `WatcherTriggersSpec.Webhook {Listen, Sources, SecretName, ServiceEnabled, ServicePort}` → renders `--webhook-listen/source` + projects every `<src>=<env-var>` source's env-var from the named Secret + (optionally) a ClusterIP Service

Operator's `BuildWatcherDeployment` reads from `cr.Spec.Watcher.Triggers` via two new helpers (`watcherTriggerArgs`, `watcherTriggerEnv`). Legacy CRs (no Triggers stanza) render byte-identical to v1.23.1.

### Added — KEDA `ScaledObject` in `watchedGVRs` (M1 follow-up)

The v1.6.0 M1 expansion added HPA + Ingress + ArgoCD + DaemonSet to the watcher's inform-loop set but missed KEDA's `keda.sh/v1alpha1/ScaledObject`. The memory note `keda-paused-scaledobject` documents the production failure mode: paused annotation set out-of-band → silent 502-after-oauth-login cascade. This release adds it:

- `GVRScaledObject` constant in `internal/snapshot`
- `watchedGVRs` includes it (auto-skip when KEDA isn't installed)
- Chart `clusterrole-reader.yaml` + operator `rbac_builders.go` both grant `keda.sh/scaledobjects` get/list/watch (no-op when KEDA absent)

1 new test asserts the GVR is present.

### Pairs with CHA-com

`v1.21.0+` adds observability log lines for Phase 3.B (auto-merge gate armed at startup) and Phase 3.C (`ai.target_history.applied` audit event when the prompt block fires).

## [1.23.1] — 2026-06-10 — 2026-06-10

Adversarial-review fixes after v1.23.0 went out.

### Fixed — webhook HTTP server actually starts now (M6 wiring gap)

v1.23.0 shipped `internal/server/webhook.Handler` + tests but
nothing in the watcher's `Run()` instantiated an HTTP server, so
M6 was compiled-but-never-loaded in production. This release wires
the receiver: `watcher.Config.WebhookListen` + `WebhookSourceSpec`
fields, `--webhook-listen` + `--webhook-source` CLI flags, an
`http.Server` mux serving `/webhook/` + `/healthz` with graceful
shutdown on `ctx.Done()`, Helm `watcher.triggers.webhook.*` values
knobs, and a new `watcher-webhook-service.yaml` Service template
with `secretKeyRef` env-var projection per registered source.

### Fixed — Prometheus trigger CLI flags actually exist (M5 wiring gap)

v1.23.0 shipped `Config.PromTriggerURL` but `cmd/cha/watch` never
registered matching CLI flags, so M5 was unreachable from
`helm install` or `kubectl apply`. This release adds
`--prom-trigger-url`, `--prom-trigger-interval`, and
`--prom-trigger-alert-filter` + Helm `watcher.triggers.prom.*`.

### Fixed — `endpointslices` RBAC for KongRoutes (M2)

KongRoutes prefers `discovery.k8s.io/v1.EndpointSlice` for
backend-readiness, but neither chart nor operator RBAC granted it.
Silently fell back to legacy `v1.Endpoints` (still works) so this
wasn't fatal — but the slice fast-path was dead code. Now granted
in `clusterrole-reader.yaml` and `internal/operator/rbac_builders.go`.

## [1.23.0] — 2026-06-09

Trigger-expansion roadmap M1-M7 bundled. Closes the
`docs/design/2026-05-trigger-expansion-roadmap.md` plan that v1.6.0
opened M1 against.

### Added — M1 expanded `watchedGVRs`

Adds `Ingress`, `HorizontalPodAutoscaler`, and `ArgoCD Application`
to the watcher's inform-loop set.

### Added — M2 `KongRoutes` probe

For each Kong-managed Ingress, verifies the backend Service has ≥1
ready Endpoint + KongPlugin / KongConsumer annotation references
resolve. Silent on clusters without Kong-managed Ingresses. Opt out
via `CHA_PROBE_KONG_ROUTES=off`.

### Added — M3 `GPUNodes` probe + `LogPatternMatcher` analyzer

- **GPUNodes** — critical on NotReady / zero-allocatable, warning
  on cordoned, for each GPU-advertising Node. Opt out:
  `CHA_PROBE_GPU_NODES=off`.
- **LogPatternMatcher** — scans Events for ImagePullBackOff,
  OOMKilled, probe-failed, volume-attach-failed, RBAC Forbidden.
  Dedup'd per (involved-object, pattern). Opt out:
  `CHA_ANALYZER_LOG_PATTERN_MATCHER=off`.

### Added — M4 Endpoints probe Layer-7 mode

`EndpointTarget.L7` populated from three Ingress annotations
(`cha.bionicaisolutions.com/probe-l7-{path,expect,status}`). When
set, second GET asserts both status + body content. Closes the
"Kong returns 200 but body is wrong" failure class.

### Added — M5 Prometheus class-C trigger

`internal/trigger/prom`. Polls Alertmanager `/api/v2/alerts` and
pushes a debounced signal on new firing-alert fingerprints. Closes
the slow-drift gap (disk fill, cert expiry creep, error-budget
burn, GPU ECC accumulation). New `Config` fields:
`PromTriggerURL`, `PromTriggerInterval` (clamped ≥5s),
`PromTriggerAlertFilter`.

### Added — M6 external webhook receiver (class E)

`internal/server/webhook`. HMAC-SHA256-authenticated POST to
`/webhook/<source>` triggers an immediate diagnose cycle. `Sign()`
exported for external integrators. Closes "rotation → probe within
seconds" loop.

### Added — M7 `pkg/probe.GVRWatcher` foundation

Optional interface for probes to declare consumed GVRs.
`GVRsOf(probe)` reads them; nil = "run on every trigger" (back-
compat). Applied to KongRoutes + GPUNodes as exemplars. Sets up
phase 2 (per-probe dispatch) and phase 3 (controller-runtime
migration) without changing today's semantics.

### Tests

35+ new tests across the milestones; full regression green.

## [1.22.2] — 2026-06-09

### Fixed — PVOrphan needs `persistentvolumes` in RBAC

v1.22.1 added PV capture (`GVRPV` in CaptureGVRs) but the watcher's
reader ClusterRole still only granted `persistentvolumeclaims`. The
PV list call silently failed with RBAC denial, so PVOrphan kept
emitting nothing on live clusters.

Adds `persistentvolumes` to:
- `charts/cluster-health-autopilot/templates/clusterrole-reader.yaml`
- `internal/operator/rbac_builders.go` (used in operator-managed installs)

Verified live: with the live ClusterRole patched and the watcher
restarted, PVOrphan now fires on the dev cluster's 117 Released PVs.

## [1.22.1] — 2026-06-09

### Fixed — PVOrphan needs `persistentvolumes` in CaptureGVRs

The v1.22.0 PVOrphan analyzer was silent on live clusters because
`internal/snapshot.CaptureGVRs` didn't include PVs (PVCs were
captured separately; PVs are their own cluster-scoped GVR). Adds
`GVRPV` to the capture list and refactors PVOrphan to consume the
shared constant. Verified live: with 117 Released PVs on the dev
cluster, the analyzer now fires the expected warnings.

## [1.22.0] — 2026-06-09

Phase 3.E + 3.D bundled.

### Added — 3 new workload-tier analyzers (Phase 3.E)

The 3 most-requested signals from the deferred wishlist:

- **`OOMKillRecurrence`** (warning) — Pod container with ≥3 OOMKilled
  restarts in 24h. Catches the sizing problem masquerading as a crash
  loop. One finding per pod (operator's edit pass fixes all containers
  simultaneously). Opts out via `CHA_ANALYZER_OOMKILL_RECURRENCE=off`.
- **`PVOrphan`** (warning) — PersistentVolume in `Released` phase for
  >7d. Underlying cloud disk (EBS / GCE-PD / Azure-Disk) may still be
  billing. Message surfaces storageClass + capacity + reclaimPolicy
  for cost-sizing. Opts out via `CHA_ANALYZER_PV_ORPHAN=off`.
- **`CronJobStuck`** (warning/critical) — CronJob whose lastSuccessfulTime
  is >24h old OR has never succeeded OR is suspended. Each cause gets
  tailored remediation guidance. Opts out via `CHA_ANALYZER_CRONJOB_STUCK=off`.

### Added — `spec.ai.metrics` + `spec.ai.llmProposer` typed CR fields (Phase 3.D)

Promotes two Phase 2 surfaces from chart-only / extraArgs-hatch into
typed CR fields so operator-managed installs (ArgoCD/Flux/kubectl apply)
don't need escape hatches.

- `AIMetricsSpec {Addr, Port}` — operator renders `--metrics-addr` arg +
  named container port + headless Service. Selectors target aiwatch pods
  so Prometheus pod-discovery sees per-pod endpoints (leader vs follower
  stay distinct in `cha_cycle_total{leader=...}`).
- `AILLMProposerSpec {Enabled}` — typed switch for the Phase 2.D LLM
  fallback proposer.

CRD schema additions on both chart-side template and OLM bundle manifest.
3 helm-template invariants preserved: legacy installs (no Metrics / no
LLMProposer fields) render byte-identical to v1.21.1.

### Pairs with CHA-com

The CHA-com binary `--metrics-addr` + `--llm-proposer` flags ship since
v1.16.0; this release wires them through the operator schema. Cluster
operators can now drop their `extraArgs: ["--metrics-addr=:9090"]`
escape hatch in favor of `spec.ai.metrics.addr: ":9090"`.

## [1.21.1] — 2026-06-08

Follow-up to the v1.21.0 Phase 2 closure. Adds the
`spec.ai.digestPinAttestation` field that the v1.21.0 merge missed
(the chart-version bump from v1.20.1 → v1.21.0 was also missed at
tag time; this release bumps both together).

### Added — `spec.ai.digestPinAttestation` chart wiring (Phase 2.H)

`DigestPinAttestationSpec {SecretName, SecretKey, KeyID}` on AISpec.
When set, the chart mounts the Secret at `/etc/cha/attestation/` and
passes `--digest-pin-attestation-key` + `--digest-pin-attestation-kid`
to the aiwatch container. Operator reconciler mirrors the chart.
Mount path is separate from `/etc/cha/keys/` so attestation key
rotation is independent of the approval-server signing key.

### Fixed — `internal/report.DeltaDiag` class-URL docs (Phase 2.B.6)

The render-only class-URL fields shipped in v1.21.0 — `ApproveClassURL`,
`DenyClassURL`, `SilenceClassURL` — now carry a doc clarifying that
the OSS enrich pipeline does NOT mint class-action JWTs (the signer
lives in CHA-com's `ai/approval`). The CHA-com aiwatch's renderer
(`cmd/cha-com/render.go`) is the active surface; the OSS render is
preparatory for a future shared-signer extraction.

### Pairs with CHA-com

`v1.16.0+` (binary-side surfaces are unchanged from v1.21.0 →
v1.21.1; only the chart's wiring of an existing CHA-com flag is new).

## [1.21.0] — 2026-06-08

Phase 2 closure on the OSS side. Pairs with CHA-com `v1.16.0`
for the paid-tier binary half.

### Added — `spec.ai.replicas` for HA aiwatch (Phase 2.F)

`ClusterHealthAutopilot.spec.ai.replicas` (`int32`, min 1 max 5).
Default 1 (single-replica, noop elector — byte-identical to pre-2.F).
When `>1`, the chart turns on `--leader-election=true` + binds the
SA to a scoped Lease Role; the binary races for a
`coordination.k8s.io/v1.Lease` named `<release>-aiwatch-leader`.
Failover within ~30s on lease loss.

### Added — Prometheus instrumentation + Grafana dashboard + canary alerts (Phase 2.G)

`ai.metrics.{addr,port,serviceMonitor,grafanaDashboard,prometheusRule}`
values opt in to: aiwatch `/metrics:9090` headless Service +
optional `ServiceMonitor` + `dashboards/cha-overview.json` ConfigMap
(Grafana sidecar labels) + `PrometheusRule` canaries
(`ChaWatcherStuck`, `ChaBreakerOpen`, `ChaAutonomyRejectionSpike`).

All gated on `ai.enabled` + non-empty `ai.metrics.addr` — pure-OSS
deploys see no new resources.

### Added — Slack class-button render row (Phase 2.B.6)

`internal/report.DeltaDiag` gains `ApproveClassURL` /
`DenyClassURL` / `SilenceClassURL`. When populated, `FormatSlackDelta`
renders an extra row under the Approve/Deny pair. Render-only on
OSS — the OSS enrich pipeline does NOT yet mint class-action JWTs
(the signer lives in CHA-com). CHA-com aiwatch's renderer
(`cmd/cha-com/render.go`) is the active surface in production.

### Added — `Silence.spec.matcher.messagePattern` (Phase 2.B.9)

Substring-match on `Diagnostic.Message`. Enables class-scoped
silences from the CHA-com `/silence-class` click. `pkg/silence.Matches`
ANDs MessagePattern alongside Source + Subject + Severity.

### Added — `DisruptionDrift` analyzer (Phase 2.E)

Three new signals: **PDB blocks all evictions** (`critical`),
**stuck Indexed Job failed indexes** (`warning`), **stale
ResourceQuota at 100%** (`warning`). Opts out via
`CHA_ANALYZER_DISRUPTION_DRIFT=off`.

### Added — `spec.ai.digestPinAttestation` chart wiring (Phase 2.H)

`DigestPinAttestationSpec {SecretName, SecretKey, KeyID}` on AISpec.
When set, chart mounts the Secret at `/etc/cha/attestation/` and
passes `--digest-pin-attestation-key` + `--digest-pin-attestation-kid`
to the aiwatch container. Operator reconciler mirrors the chart.
Mount path is separate from `/etc/cha/keys/` so attestation key
rotation is independent of the approval-server signing key.

### Pairs with CHA-com

`v1.16.0+` carries the binary-side surfaces this chart drives:
class-action JWT routes, `/metrics` endpoint, attestation signer,
lease elector, LLM proposer, autonomy class-policy bypass.

## [1.20.1] — 2026-06-07

### Fixed — Finish Phase 1.B placeholder substitution across analyzers (PR #169)

PR #164 (shipped in v1.18.3 / re-stated in v1.19.0) addressed Phase 1.B by substituting `<name>` / `<selector>` placeholders in `capacity_drift.go` + `config_drift.go`. The post-Phase-1 adversarial audit caught 4 more analyzers still leaking literal `<placeholder>` tokens that neither the AI tier could parse nor operators could action without manual lookups:

  - **`security_drift.go`** digest-pin remediation — now reads `status.containerStatuses[].imageID` (kubelet has already resolved every running image to a sha256 at pull time) and renders per-container substitution `Replace foo:1.2.3 with foo@sha256:…`. Strips the `docker-pullable://` kubelet prefix. Falls back to a concrete `crane digest <actual-image>` invocation when the Pod hasn't been scheduled.
  - **`dns_chain_drift.go`** missing-ingress remediation — refactored into `renderMissingIngressRemediation(host)` helper that renders a copy-pasteable Ingress YAML skeleton with the actual host substituted.
  - **`rbac_drift.go`** unbound-SA remediation — reworded "Pick a Role (list candidates with `kubectl get role`) … `--role=NAME (substitute NAME …)`" — no bare `<role-name>` token.
  - **`workload_state_drift.go`** CNPG follower remediation — reworded "Identify the non-Ready follower, then `<that-pod-name>` (substitute the pod name from the prior list)" — no bare `<follower-pod>` token.

Audit grep across `internal/diagnose/*.go` (non-test) Remediation strings for the strict token set `<name>|<placeholder>|<image>:<tag>|<selector>|<digest>|<svc-name>|<port>|<role-name>|<follower-pod>` now returns **0 hits**.

### Fixed — Align ticketing values shape with CRD (PR #170)

Chart values block used nested `ticketing.openproject.{mcpURL, projectID, …}`; CRD uses flat `ticketing.{mcpURL, project, …}`. Users could not move YAML between `helm upgrade -f values.yaml` and `kubectl patch cha …` without reshaping. Fixed by flattening the chart shape to mirror the CRD exactly; legacy nested form honored as a fallback (will be removed in the next major chart bump).

