<!-- DO NOT EDIT — vendored snapshot of CHANGELOG.md (Bionic-AI-Solutions/cluster-health-autopilot) -->
<!-- source: CHANGELOG.md (Bionic-AI-Solutions/cluster-health-autopilot) -->
<!-- synced: 2026-06-12 -->
<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->
<!-- truncated to newest 12 release sections; the public roadmap renders these only -->

## [1.26.0] — 2026-06-12

Release cut covering everything merged since v1.25.1 (PRs #186–#203 plus the O9 release PR): the operator CronJob unknown-flag production fix, the housekeeping/honesty batches (O6–O8), the trigger/security hardening from the adversarial review (P1.x/P2.x), supply-chain provenance (P6.2), ticketing M2, the dashboard + playground deploy surfaces, and the new CHANGELOG↔tag CI gate.

### Added — CI: CHANGELOG ↔ git-tag parity gate (`scripts/changelog-tag-check.sh`)

Companion to `changelog-lint.sh` (which checks heading format): every released `## [x.y.z]` heading except the topmost (the release in flight) must have a matching `vx.y.z` tag (or chart-releaser `cluster-health-autopilot-x.y.z` tag — the 1.8.x line shipped chart-only cuts under that form), and `[Unreleased]` content may not present a version as already shipped (no dated `### [x.y.z] — YYYY-MM-DD` headings, no version-numbered headings). Both `[Unreleased]` checks are anchored to the markdown HEADING signature, so prose that merely cross-references a version and a date (e.g. `- Backport of [1.25.1] fix from 2026-05-11`) passes instead of false-positiving. Catches the claimed-but-never-tagged release class. Runs in the lint CI job next to changelog-lint (the job's checkout now fetches tags), followed by `scripts/changelog-tag-check_test.sh` — positive/negative fixture selftests for the gate itself, including the prose-mention case.

### Added — cloud-probe message join keys for CHA-com's cross-resource RCA matchers

CHA-com's cross-resource RCA matchers (ai/cloudcontext, PR #65) join Kubernetes resources to cloud findings via tokens parsed out of the finding MESSAGE. Three LB probes and the Azure cert probe omitted the join keys; they now carry them. **Message-only enrichment** — subjects, severities, and finding counts are unchanged, and the suffix format is a frozen cross-repo contract: single space, literal `(lb: ` / `(domains: `, comma-separated domains with no spaces, closing paren.

- **`aws-alb-target-health`** — the 0-healthy-targets finding appends ` (lb: <load balancer DNS name>)`. The live wrapper resolves the target group's `LoadBalancerArns` via ONE `elbv2.DescribeLoadBalancers` per probe cycle (not per target group); new optional `ALBTargetGroup.LoadBalancerDNS` (`loadBalancerDNS` snapshot field).
- **`gcp-lb-backends`** — the 0-healthy-backends finding appends ` (lb: <forwarding-rule IP or name>)`, falling back to the backend-service name when unmapped. The live wrapper adds ONE `compute.ForwardingRules.AggregatedList` per probe cycle, joining passthrough-LB rules on `rule.BackendService` (proxy-based rules would need a target-proxy + URL-map walk and are deliberately left to the name fallback); new optional `BackendService.ForwardingRule` (`forwardingRule` snapshot field).
- **`azure-appgw-backends`** — the 0-healthy-members finding appends ` (lb: <AppGW public hostname>)` from the already-fetched HTTP-listener config (`HostName`/`HostNames`; no extra API call), falling back to the gateway name; new optional `AppGatewayBackend.FrontendHostname` (`frontendHostname` snapshot field).
- **`azure-certs`** — both cert findings (`expires` / `is not issued`) append ` (domains: <d1>,<d2>)` from the certificate resource's `HostNames` (SANs/CN, already in the fetched data); new optional `Certificate.Domains` (`domains` snapshot field). Omitted entirely when no domains are known.
- **Backward/offline compat** — all four fields are optional snapshot additions; live-wrapper enrichment fetches are best-effort and never fail the probe.
  - AWS (`aws-alb-target-health`) and Azure certs (`azure-certs`): absent or failed enrichment → the pre-enrichment message with no suffix added (no `(lb: ...)` or `(domains: ...)`) (name is not enough — DNS/IP needs a separate API call, so without it there is nothing safe to emit).
  - GCP (`gcp-lb-backends`) and Azure AppGW (`azure-appgw-backends`): absent or failed enrichment → name-only suffix, e.g. `(lb: my-forwarding-rule)` or `(lb: my-appgw)`, because the backend/gateway name is already present in local data (name is in-process and always available; DNS/IP needs a separate API call). Never a panic or an empty `(lb: )`.
- **Contract pinned** — shared suffix builders in `internal/cloud/joinkeys.go` (`JoinKeyLB`, `JoinKeyDomains`) + `internal/cloud/contract_test.go` freezing the literal `" (lb: %s)"` / `" (domains: %s)"` formats with a pointer at the CHA-com dependency; per-probe tests assert the exact enriched message with the data present AND the unsuffixed shape when absent; live-layer helper tests cover the ARN→DNS map, the forwarding-rule index, listener-hostname extraction, and SAN flattening. No chart/CRD changes.

### Added — hash-chained audit-trail primitive in OSS `pkg/audit` (closes the features/policy source-citation gap)

The website's features/policy page cites `pkg/audit/hash_chain.go` as the auditable open-source implementation of the tamper-evident audit trail, but the hash-chain primitive previously lived only in the private CHA-com repo — the cited file did not exist here. The primitive is now ported (first-party code, Apache-2.0), so "audit the envelope before you install" includes the chain itself.

- **`pkg/audit/hash_chain.go`** (new, stdlib-only) — the full chain core operating directly on the OSS `ai.AuditEvent`/`ai.AuditSink` types: `ChainedSink` (canonical-JSON hashing, `prev_hash`/`entry_hash` linking, tamper-evident `entry_time` stamping via `EntryTimeKey`, failed inner write does NOT advance the chain), `NewChainedSinkResuming(inner, resumeHash, ChainOptions{Signer, CheckpointEvery})` (a restart continues the existing chain instead of re-anchoring at `""`; periodic signed checkpoints), `WriteCheckpoint` (caller-triggered tail anchor, e.g. on close), `CheckpointSigner` (narrow signing interface; concrete Ed25519 adapters live with the caller), `VerifyChain` (first broken index or -1), and `VerifyChainWithCheckpoints`/`ChainVerification` (tail-truncation detection: the hash links alone cannot catch lopping off the tail; only a signed checkpoint as the final entry anchors it).
- **OSS vs paid boundary** — the chain primitive + verification are OSS; the richer sinks the chain wraps (JSONL chained file with rotation, Loki, OTLP/SIEM) remain in the paid CHA-com binary, registered via the registry without removing the defaults. The package doc states the split and the intended CHA-com adapter path (import swap + `NewChainedSinkResuming` from the store's last persisted `entry_hash` + `WriteCheckpoint` on close; the CHA-com swap itself is a separate follow-up after the next OSS release).
- **Tests** (`pkg/audit/hash_chain_test.go`, 23 cases) — chain integrity and link consistency; tamper detection at EVERY position for five tamper classes (struct field, Details key, `entry_hash` forgery, `prev_hash` forgery, timestamp edit); reordering detection; resumption continues across sink lifetimes with no `""` re-anchor; checkpoint cadence; signed-checkpoint tail-truncation detection (plain `VerifyChain` accepts the truncated prefix, the checkpoint-aware verifier flags it); unsigned/absent checkpoints report an unanchored tail; a broken chain reports `BrokenIndex` AND the last trustworthy `LastCheckpointIndex` (scanned over the verified prefix only) together; Ed25519 checkpoint signatures verify against the head hash; canonicalization stability (map insertion order, nested maps, unicode — CJK/RTL/emoji/combining marks — and fixed-clock determinism); and a golden-bytes canonical-format contract test (`TestCanonicalJSON_FormatContract`) freezing the exact `encoding/json.Marshal` form — declaration-order struct fields, sorted map keys, HTML-escaping ON — that production chains already use, so any accidental format change (e.g. `SetEscapeHTML(false)`) fails loudly instead of silently breaking cross-version verification.

### Added — append-only protected-namespace extension (`CHA_PROTECTED_NAMESPACES_EXTRA`)

The website's policy page promised the protected-namespace list is "configurable; the operator extends this list per cluster", but both compiled-in lists (`internal/fix/protected.go` for the fixer guard, `pkg/ai/validate.go` for the AI-action validator) had no extension mechanism. Now there is one — APPEND-ONLY by construction: operators can ADD protected namespaces; nothing can remove the compiled-in floor (`kube-system`, `kube-public`, `kube-node-lease`, `rook-ceph`, `vault`, `external-secrets`, `cnpg-system`).

- **Binary** — new env var `CHA_PROTECTED_NAMESPACES_EXTRA` (comma-separated; entries trimmed, empties dropped, duplicates collapsed) consumed by BOTH act-side guards. `pkg/ai` (new `protected.go`) owns the shared extra set — `EnvProtectedNamespacesExtra`, `ParseProtectedNamespacesExtra`, `SetExtraProtectedNamespaces(...)` (host/test initializer), `LoadExtraProtectedNamespacesFromEnv()`, `IsExtraProtectedNamespace`, `ExtraProtectedNamespaces()` — loaded lazily on first check, so the cha-com aiwatch (which links `pkg/ai`) inherits the widened floor with zero code change. `internal/fix.IsProtectedNamespace` keeps its compiled floor and ORs in the shared extras, so the fixer guard and the AI validator can never disagree. The detect side honors the same knob: `internal/probe.IsProtectedNamespace` (severity ESCALATION — in probe-land protected namespaces are "always-critical", e.g. the CrashLoop probe) ORs in the shared extras too, so an issue in an extra-protected namespace is escalated, not just shielded from auto-fix. **Backward compatible**: `ai.IsProtectedNamespace` / `ai.ProtectedNamespaces` signatures unchanged; the exported map is now documented as the compiled-in FLOOR (extras live alongside, never inside it).
- **Helm** — new `protectedNamespaces.extra: []` value; a non-empty list renders `CHA_PROTECTED_NAMESPACES_EXTRA` on the watcher Deployment, diagnose + remediate CronJobs, AND the aiwatch Deployment (empty = byte-identical render). The Gatekeeper third-layer constraint (`gatekeeper.constraints.protectedNamespaces`) now appends `protectedNamespaces.extra` (deduped) so the admission gate enforces the same widened boundary.
- **Operator** — new top-level CR field `spec.protectedNamespacesExtra []string` (ONE field feeding both consumers — deliberately not under `spec.remediate` or `spec.ai`, because splitting the knob per consumer would invite the two safety floors to diverge; rationale in the field's doc comment). Rendered by the builders onto the watcher Deployment, both CronJobs, AND `aiEnv` (aiwatch). CRD schema added to both the chart template and `bundle/manifests` (the Go↔CRD and bundle↔chart parity gates pin them); `bundle/tests/sample-cr-full.yaml` extended; hand-maintained DeepCopy updated.
- **Safety tests** — floor preserved under empty/garbage/whitespace env values and under attempts to "replace" the list (`pkg/ai/protected_test.go`, `internal/fix/protected_test.go`, `internal/probe/protected_test.go`); extension visible to the fixer guard, the probe severity escalation, the proposal validator (`Validate()` → `ErrProtectedNamespace`), and the safe-apply manifest validator (`ErrManifestProtectedNS`); lazy env load can never clobber a racing `SetExtraProtectedNamespaces` (double-checked locking, pinned by `TestLazyEnvLoad_DoesNotClobberRacingSetter`); operator builder env propagation + absent-when-unset (`internal/operator/protected_namespaces_test.go`); helm-unittest for all four workloads; the P1.8 toggle-drift gate now scans `pkg/ai/protected.go`.
- **Docs** — `docs/SETUP_GUIDE.md` values appendix + TLSSecretMismatch safety constraints describe the floor + extension (and no longer claim a `cha.bionicaisolutions.com/protected` namespace-label mechanism that never existed in the code).

### Added — toggles for the 6 base probes + 7 core analyzers (docs said "each probe independently togglable"; now it's true)

The public docs promised every probe/analyzer is independently disablable, but the six base probes (Ceph, Nodes, Postgres, PVCs, Critical Services, Endpoints) and seven core analyzers (SecretKeyMissing, FailingExternalSecrets, ProactiveSecretKeyCheck, UnprovisionedSecret, ImagePullAuth, CertExpiry, TLSSecretMismatch) were registered unconditionally in `catalog/catalog.go` — no env gate, no chart toggle.

- **catalog** — each now follows the exact `os.Getenv("CHA_X") != "off"` opt-out pattern the 15 existing gated probes/analyzers use. New env vars: `CHA_PROBE_CEPH`, `CHA_PROBE_NODES`, `CHA_PROBE_POSTGRES`, `CHA_PROBE_PVCS`, `CHA_PROBE_CRITICAL_WORKLOADS` (gates the Critical Services probe — the documented env name), `CHA_PROBE_ENDPOINTS`, `CHA_ANALYZER_SECRET_KEY_MISSING`, `CHA_ANALYZER_FAILING_EXTERNAL_SECRETS`, `CHA_ANALYZER_PROACTIVE_SECRET_KEY_CHECK`, `CHA_ANALYZER_UNPROVISIONED_SECRET`, `CHA_ANALYZER_IMAGE_PULL_AUTH`, `CHA_ANALYZER_CERT_EXPIRY`, `CHA_ANALYZER_TLS_SECRET_MISMATCH`. **All 13 default ON — no behavior change for existing installs** (these probes/analyzers have shipped default-on since v1.0; the toggle only adds the documented opt-out, so the P3.3a default-off discipline records a status-quo soak rationale in the golden rather than shipping the secret-chain core signal default-off).
- **chart** — `probes.{ceph,nodes,postgres,pvcs,criticalWorkloads,endpoints}.enabled` and `analyzers.{secretKeyMissing,failingExternalSecrets,proactiveSecretKeyCheck,unprovisionedSecret,imagePullAuth,certExpiry,tlsSecretMismatch}.enabled` (all default `true`), wired through the existing `cha.probeToggleEnv` / `cha.analyzerToggleEnv` helpers — `enabled: false` emits `CHA_*=off` on the watcher + diagnose containers, byte-identical render at defaults.
- **tests** — `catalog/catalog_test.go` (new): every toggle registers by default, skips on `=off`, doesn't drop siblings, and non-`off` values (`true`/`OFF`/garbage) do NOT disable; helm-unittest coverage extended (`probe_toggle_test.yaml` + new `analyzer_toggle_test.yaml`); the P1.8 toggle-drift and P3.3a default-off chartgates pass with the new inventory.
- **operator** — no change needed: the CR has no probe/analyzer toggle surface today (the existing 15 toggles aren't operator-settable either); tracked as a follow-up alongside a watcher `extraEnv` passthrough rather than growing the CRD here.
- **docs** — `docs/SETUP_GUIDE.md` env-var tables list the 13 new toggles with their Helm values.

### Added — chart: deploy the read-only hosted dashboard (P6.6)

P6.6 shipped a `cha-com dashboard` subcommand (a read-only, server-rendered HTML view of findings/approvals/history). This wires the OSS Helm chart to actually deploy it, mirroring the approval-server's chart pattern.

- **values.yaml** — a new `dashboard:` block, default `enabled: false` (byte-identical render for existing installs). Carries `image` (defaults to the `docker4zerocool/cha-com` image like `approval`/`ai`), `replicas`, `approvalBaseURL` (REQUIRED when enabled — the approval-server URL the Approve/Deny/Ignore links target), `authHeader` (default `X-Forwarded-User`), optional `auditLogPath`, `historyLimit`/`approvalsLimit`, `ingress.{host,ingressClassName,annotations,tls}`, and `networkPolicy.{enabled,gatewayNamespaceSelector}` (default-off, required-selector-when-enabled — the same P2.6b fail-closed contract as `approval.networkPolicy`).
- **Templates** (all gated on `dashboard.enabled`) — `dashboard-deployment.yaml` (runs `cha-com dashboard` with `--approval-base-url` + `--auth-header`), `dashboard-service.yaml` (ClusterIP :8444), `dashboard-serviceaccount.yaml` (a DEDICATED `<release>-dashboard` SA), `dashboard-rbac.yaml` (a **read-only** ClusterRole — `get/list/watch` on `driftreports` only, plus `resolutionrecords` read when that CRD is enabled — bound to the dashboard SA; **no signing key, no mutate verbs, no Secret access**), `dashboard-ingress.yaml`, and `dashboard-networkpolicy.yaml` (mirrors the approval-server P2.6b NetworkPolicy: restricts ingress to the gateway namespace).
- **Guard test** — `chart_dashboard_binding_sa_test.go` asserts the dashboard ClusterRoleBinding targets the dashboard's OWN SA (`<fullname>-dashboard`, not the watcher SA — the silence-binding-bug class) AND that the ClusterRole carries ONLY `get/list/watch` with no mutate verb and no `secrets` reference.

Operator path: this follow-up is **chart-only by design**. Wiring the operator (a `DashboardSpec` CRD field + DeepCopy + reconcile/teardown + a cluster-scoped ClusterRole/Binding requiring finalizer cleanup) would touch the CRD and trip the CRD/RBAC/bundle parity gates; per the P6.6 deploy note the operator path is tracked as a separate follow-up so the parity gates stay green and the CRD surface is unchanged.

### Added — hosted playground bundle: live synthetic-drift demo (P6.8) — **shipped** (deploy + DNS are the operator's final step)

The website's "Try it now" / playground CTA now has a real, kind-verified, deployable implementation under `examples/playground/`. A visitor watches CHA detect synthetic K8s drift **live** — real watcher, real `DriftReport` CRs, real broken workloads — inside a fully isolated namespace that cannot disturb anything else.

- **Drift injector** (`drift-injector.yaml`): a CronJob (stock `alpine/k8s` image + inline bash, no custom build) that creates and rotates **four** synthetic scenarios every 15 min, each mapped 1:1 to a **shipped OSS analyzer/probe** (verified firing on kind): (1) Deployment with a bad imagePullSecret pulling a private Docker Hub repo → `ImagePullAuth` (`internal/diagnose/image_pull_auth.go`); (2) Job referencing a missing Secret key → `SecretKeyMissing` (`internal/diagnose/secret_key_missing.go`); (3) Ingress serving an **expired** TLS secret while a Ready cert-manager `Certificate` renews the same host into a **different** secret → `TLSSecretMismatch` (`internal/diagnose/tls_secret_mismatch.go`); (4) CrashLoopBackOff Deployment → `CrashLoopBackOff` probe (`internal/probe/crashloop.go`).
- **Isolation** (`namespace.yaml`): dedicated `cha-playground` namespace (PSA `baseline`) + **ResourceQuota** (30 pods / 1 CPU / 1Gi) + **LimitRange** + **default-deny NetworkPolicy** (only DNS / in-namespace / HTTPS-out re-opened) + **namespaced injector RBAC** (acts only in-namespace) + a viewer ClusterRole granting **only** `get/list/watch` on `driftreports`. Every workload carries `nodeAffinity` excluding GPU nodes (`nvidia.com/gpu.present DoesNotExist`).
- **Viewer** (`viewer/`, ~180 lines Go): a self-contained **OSS** read-only page (not the CHA-com dashboard, so anyone can `kind`-run it) that lists the cluster-scoped `DriftReport` CRs and renders them with `html/template` (**XSS-safe** — tested). Deployment + Service + Ingress (`playground.asre.baisoln.com`, Kong ingressClass + `cert-manager.io/cluster-issuer: letsencrypt-prod`, mirroring the cluster's website/grafana ingress).
- **CHA watcher** (`cha-values.yaml`): the OSS chart installed scoped to `cha-playground`, **diagnose-only** (`watcher.remedy.enabled=false`), AI/approval/ticketing/cloud all off, single pod, GPU-excluded. The playground only DETECTS drift; it never mutates.
- **Runbook** (`README.md`): kind quick-try (anyone can run locally), prod deploy, the **DNS step documented but NOT executed** (Cloudflare A record + `deploy/lib/dns.sh` `DNS_DOMAINS` entry per the dns-new-subdomains rule), and teardown. Honest scope note: `DriftReport` is cluster-scoped and `cha watch` lists cluster-wide, so the reader ClusterRole is cluster-wide read-only (safe with remedy off; only `cha-playground` ever contains injected drift).
- **kind verification:** created a kind cluster, installed the chart + bundle, injected all four scenarios, and confirmed the watcher produced DriftReports for each (`ImagePullAuth`, `SecretKeyMissing`, `TLSSecretMismatch`, `CrashLoopBackOff` probe) and the viewer rendered them (29 active reports, `/healthz` 200). `helm lint` + `kubeconform` + `kubectl apply --dry-run=server` clean; viewer `go build`/`vet`/`test`/`gofmt` clean incl. an XSS test. Hosted deploy + DNS remain the operator's final manual step.

### Added — chart + operator: ticketing.{jira,servicenow,route} values → CHA-com ticketing env (makes the paid Jira/ServiceNow sinks deployable)

The CHA-com Jira/ServiceNow ticketing sinks just shipped but were undeployable end-to-end: nothing populated the `CHA_JIRA_*` / `CHA_SERVICENOW_*` / `CHA_TICKETING_ROUTE` env vars the aiwatch (cha-com) container reads. This wires them through both render paths the OSS chart/operator own.

- **values.yaml** — the `ticketing:` block gains `route` (→ `CHA_TICKETING_ROUTE`), `jira.{url,project,email,issueType,priority.{critical,warning,info},webUrlBase}` + `jira.tokenSecret.{name,key}` (→ `CHA_JIRA_TOKEN`), and `servicenow.{url,user,urgency.*,impact.*,webUrlBase}` + `servicenow.passwordSecret.{name,key}` / `servicenow.bearerSecret.{name,key}` (→ `CHA_SERVICENOW_PASSWORD` / `CHA_SERVICENOW_BEARER`). All default empty/unset — byte-identical render for existing installs.
- **Render (chart + operator).** New `cha.ticketingProviderEnv` helper (mirroring `cha.aiEnv`) and `internal/operator` `ticketingProviderEnv` add the env to the aiwatch container in lockstep. Plain (non-secret) values render as `value:`; **credentials (Jira token, ServiceNow password/bearer) render as `valueFrom.secretKeyRef` ONLY — the literal never appears in the manifest**, mirroring the existing `ai.apiKey.secretName` pattern. Each env var is emitted only when its source is set: no empty `CHA_JIRA_TOKEN` when no secret-ref is configured.
- **CRD parity.** `TicketingSpec` gains `Route`, `Jira` (`TicketingJiraSpec`), and `ServiceNow` (`TicketingServiceNowSpec`) with secret-refs via a new `TicketingSecretRef`; hand-ported into the chart CRD, the bundle CRD, and `bundle/tests/sample-cr-full.yaml` (full-surface coverage). DeepCopy hand-written per repo convention. All parity gates (CRD↔Go-types, bundle↔chart, full-surface sample, RBAC, toggle/flag) stay green. No RBAC change — the kubelet resolves the secret-ref at pod admission; the operator only emits the reference.

### Added — CycloneDX SBOM + cosign keyless image signing + attestation (P6.2)

The release pipeline now emits verifiable supply-chain provenance, making the website's "SBOM (paid)" and "Cosign-signed container images with attestation" claims real and customer-verifiable. `.goreleaser.yaml` gains three pipes: `sboms:` (syft → one **CycloneDX JSON** SBOM per binary archive, attached to each GitHub Release), `signs:` (cosign **keyless** `sign-blob` over `checksums.txt` → `checksums.txt.sigstore.json`, transitively covering every archive + SBOM), and `docker_signs:` (cosign **keyless** `sign` over every container image + multi-arch manifest on both Docker Hub and GHCR, recorded in the Rekor transparency log). Keyless = no private key on disk: the release workflow's GitHub OIDC token (`permissions: id-token: write`) is exchanged for a short-lived Fulcio certificate. The release workflow installs syft (`anchore/sbom-action/download-syft`) + cosign (`sigstore/cosign-installer`) and runs goreleaser with `--timeout 2h` (the 1h internal default is too tight once SBOM + signing pipes are added on top of multi-arch buildx). New `docs/RELEASE_VERIFICATION.md` documents the exact `cosign verify` / `cosign verify-blob` commands (certificate-identity-regexp + GitHub OIDC issuer) and how to download + inspect a CycloneDX SBOM. Verified locally: `goreleaser check` passes and `goreleaser release --snapshot` produces six valid CycloneDX 1.6 SBOMs (104 components each); the signing pipes only execute in CI under a real OIDC token.

### Added — ticketing: resolve-on-clear + debounced comment-on-recurrence (M2, P6.5) — tickets now auto-close

`Sink.Resolve` and `Sink.Comment` shipped in M1 with **zero call sites** — tickets never auto-closed and never got a recurrence comment, which trains operators to ignore the ticket sink. M2 wires both.

- **Resolve-on-clear (default ON).** When a previously-ticketed finding is no longer present in the diagnose cycle, CHA closes the ticket with reason `CHA: condition cleared as of <ts>`. The cleared-subject set is computed in the watcher (seen last cycle, absent now) **independently of the Slack `postOnResolved` setting**, and `report.RouteResolves` runs **before** `Reconcile` deletes the DriftReport CR — the only point at which the persisted `TicketRef` on `status.ticket` is still readable. Idempotent: a resolved ticket is stamped `status.ticket.resolved=true` + `resolvedAt`, and CHA never re-resolves it.
- **Comment-on-recurrence (debounced).** A finding that already has a ticket (still-open, or a resolved ticket whose finding reappeared) now comments on the **existing** ticket instead of the M1 no-op, debounced by `ticketing.commentInterval` (default `1h`) keyed on `status.ticket.lastCommentedAt` so a flapping finding can't spam the tracker. A recurrence after a clear also clears the `resolved` flag so the next clear resolves the ticket again. **After-interval recurrence reuses the existing ticket (no new ticket is opened)** — one ticket per finding keeps the operator's investigation history together.
- **Severity-transition comment.** A still-open ticketed finding that changes severity gets a transition comment (debounced like recurrence). Severity is stamped on `status.ticket.severity` at open / last comment so the next transition is detectable.
- **CRD/status:** new `status.ticket` fields `severity`, `resolved`, `resolvedAt`, `lastCommentedAt` (chart DriftReport CRD + bundle CRD).
- **Config:** new `ticketing.resolveOnClear` (default `true`) and `ticketing.commentInterval` (default `1h`) chart values; binary flags `--ticketing-resolve-on-clear` / `--ticketing-comment-interval` (+ `TICKETING_RESOLVE_ON_CLEAR` / `TICKETING_COMMENT_INTERVAL` env); operator `spec.ticketing.{resolveOnClear,commentInterval}` (chart + bundle CRD, full-surface sample CR, builder emits the flags — `resolveOnClear` nil defaults to `=true`). No-op when no ticketing provider is configured.

### Added — explicit OWASP K8s Top-10 mapping + posture-non-regression guard (G2)

The fixer safety envelope (protected namespaces, GitOps-aware skip, dry-run, minimal RBAC) was real but the "we don't violate OWASP" property was unlabeled and untested. It is now explicit and locked. New `docs/OWASP_MAPPING.md` maps every fixer (`internal/fix/*.go`) and every security-relevant analyzer signal (`SecurityDrift`, `RBACDrift`, `TLSSecretMismatch`, `NetworkPolicyProposer`, the digest-pin signal, …) to the OWASP Kubernetes Top-10 item(s) it **respects** (fixers — proven not to violate) or **detects** (analyzers — observational, detection ≠ enforcement). Each fixer's doc comment now names the OWASP item it respects. The key deliverable is `internal/fix/owasp_posture_test.go`: a table-driven guard that runs every fixer against a fixture, captures each Delete/Patch, and asserts no mutation ever removes/weakens a NetworkPolicy (K07), adds `privileged`/`hostPath`/`hostNetwork`/a capability (K01), broadens RBAC (K03), downgrades a TLS secret reference (K08), or deletes in a protected namespace. A meta-check scans the package for every `Fixer`-implementing type and fails the build if a fixer has no posture-test entry — a new fixer **cannot** silently skip the guard. Wires nothing new into CI beyond the existing `go test ./...`.

### Added — operator + chart: approval-server NetworkPolicy closes the X-Forwarded-User bypass (P2.6b)

The approval-server trusts the `X-Forwarded-User` header for audit attribution. That header is injected by oauth2-proxy at the OIDC ingress after a successful login — but the approval-server's `ClusterIP` Service is reachable by any pod in the cluster, and a pod hitting it directly bypasses the ingress and can forge an arbitrary `X-Forwarded-User`. The approve/deny click still requires a valid one-time signed token, so this was defense-in-depth for attribution honesty, not an auth bypass — but it let any pod corrupt the audit trail's "who approved this" field.

A new **opt-in NetworkPolicy** restricts ingress to the approval-server pods (port 8443/TCP) to **only the gateway/oauth2-proxy namespace**, so the only `X-Forwarded-User` the server ever sees is the one oauth2-proxy set.

- Operator: `BuildApprovalServerNetworkPolicy(cr)` (owner-ref'd, reconciled alongside the approval-server Deployment/Service; torn down when disabled). `podSelector` matches the Deployment's pod labels exactly.
- CRD/types: new `spec.approval.networkPolicy.{enabled, gatewayNamespaceSelector}` (chart CRD + bundle CRD + full-surface sample CR).
- Chart: `templates/approval-server-networkpolicy.yaml` + `approval.networkPolicy.{enabled, gatewayNamespaceSelector}` values.
- RBAC: the operator ClusterRole (chart + bundle CSV) gains `networkpolicies` create/update/patch/delete on `networking.k8s.io`.
- **Default OFF**, strongly recommended in production. A NetworkPolicy is fail-closed: defaulting on with a wrong/absent `gatewayNamespaceSelector` (or on a CNI that doesn't enforce NetworkPolicy) would silently 0-route every approval click — a worse outcome than the bug it closes. `gatewayNamespaceSelector` is **REQUIRED** when enabled (operator fails the CR `Ready=False/InvalidSpec`; chart `fail`s the render) — there is no safe default selector.

### Added — watcher health probes + opt-in multi-replica via leader election (P1.9)

The watcher Deployment shipped with no liveness/readiness probes (every sibling deployment — approval-server, qdrant, operator — had them) because its only HTTP `/healthz` lived inside the `--webhook-listen` branch, so an install without the M6 webhook trigger had no health endpoint to probe. The watcher now starts an **always-on health server** (`--health-listen`, default `:8081`; chart value `watcher.healthListen`) serving `GET /healthz` unconditionally, independent of the webhook receiver, and the chart wires `livenessProbe` + `readinessProbe` against it. The watcher Deployment's hard-coded `replicas: 1` is now `watcher.replicas` (default 1); raising it above 1 is only safe with leader election on, so the chart **fails the render** when `watcher.replicas > 1` and `watcher.leaderElection.enabled=false` (otherwise replicas race on DriftReports and double-post Slack).

### Added — optional timestamped HMAC scheme (replay window)

Webhook senders can now include `X-CHA-Timestamp: <unix-seconds>` and sign `timestamp + "." + body` (`X-CHA-Signature: sha256=hex(hmac-sha256(secret, ts+"."+body))`). Timestamped requests more than 5 minutes from server time are rejected with 401, so a captured request can no longer be replayed forever. Requests without the header keep the legacy body-only HMAC check (existing senders unaffected); a once-per-source log notice recommends adopting the timestamp header. New `webhook.SignWithTimestamp` helper for integrators.

### Changed — drive-by polish from the #203 quality review

- `pkg/cloud/gcp.Subnet.SecondaryIPCount` doc comment now states it ships DATA-ONLY (snapshot capture surface; no probe consumes it), and new `internal/cloud/gcp/cidr_test.go` pins the full-size (`rangeSizeFromCIDR`, secondary ranges, no reservations) vs usable (`usableIPsFromCIDR`, primary range, minus GCP's 4 reserved) semantics against each other.
- watcher: the `snapshot.AsMutator` gate is hoisted ABOVE `silence.CountMatches`, so snapshot/dry-run sources skip the per-silence match counting entirely (counts feed only the status writer; without a Mutator they were dead work).
- `catalog/cloud.go`: comment pinning that the literal `os.Getenv(...) != "off"` form is load-bearing for the chartgate regex scanners; `gcpSubnetSmallPrefix()` now logs invalid `CHA_CLOUD_PROBE_GCP_SUBNETS_SMALL_PREFIX` values before falling back to the compiled-in /26 default (was: silent).
- test hygiene: `strings.HasPrefix` replaces the panicky `n[:4]` slice in `catalog/cloud_test.go`; `crd_printcolumn_parity_test.go` derives the chart CRD path from the `markerSources` entry instead of hardcoding `crd-silence.yaml` (a second CRD entry can no longer silently compare against the wrong file).

### Changed — housekeeping batch: cloud values wired-or-deleted (O6), GCP subnet capacity contract (O7), Silence UNTIL column + status writer (O8)

Three doc-vs-code honesty fixes shipped as one batch. After this change every key in the chart's `cloud:` block does something, the GCP subnet probe's docs match what it can actually measure, and `kubectl get silences` renders all five printer columns correctly.

**O6 — dead Helm cloud values: wired or deleted.**

- **Wired: `cloud.<provider>.probes.*`** (previously "informational" — the comment admitted only `aws.enabled` did anything; the binary registered all 10 probes per provider unconditionally). Each cloud probe is now independently disablable via `CHA_CLOUD_PROBE_<PROVIDER>_<NAME>=off` (default ON — these probes have registered unconditionally since v1.8, so default-on preserves the status quo exactly; soak rationale recorded in the P3.3a golden), following the exact `os.Getenv(...) != "off"` pattern of the K8s `CHA_PROBE_*` gates. The chart renders the envs from `cloud.{aws,gcp,azure}.probes.*` via the new `cha.cloudProbeToggleEnv` helper (GCP and Azure gain `probes:` blocks to match AWS). The `eks` / `gke` / `aks` keys each gate BOTH the control-plane and node-pool probes (one asset, one key). Gates extended: P1.8 toggle-drift and P3.3a default-off now scan `catalog/cloud.go`; new `catalog/cloud_test.go` (default-on / `=off` skips / sibling isolation / non-off values keep registration) + helm-unittest `cloud_probe_toggle_test.yaml`; SETUP_GUIDE env-var table lists all 27 toggles.
- **Deleted: `cloud.rateLimitPerMin`** — consumed by nothing (rate protection is, and was, the `cloud.cadence` interval). Removed from values.yaml; design-doc sketch annotated as not-shipped.
- **Deleted: `cloud.{aws,gcp,azure}.auth.mode` + `cloud.aws.auth.assumeRoleArn` + `cloud.*.auth.credentialsSecret`** — the `assumeRole` / `staticCredentials` modes were never implemented; only `roleArn` / `serviceAccount` / `clientId` are consumed (→ workload-identity SA annotations, which remain). `serviceaccount.yaml` simplified accordingly. Assume-role / static-credential support would be a net-new FEATURE, not a doc fix — recorded here so it can be reintroduced deliberately if demanded.
- **Fixed: stale `catalog/cloud.go` comment** describing the v1.9 monitoring wiring as future work — rewritten in present tense to the actual live-mode coverage (Cloud SQL / Azure SQL storage-% and App Gateway health are Monitoring-API-backed best-effort; GCP subnets are capacity-only, see O7).
- **Operator**: no change — the CR has no per-probe toggle surface for the existing K8s probe toggles either; same follow-up as PR #198.

**O7 — GCP Subnet probe: honest capacity-only contract (the last inert cloud signal).**

- Decision (researched, documented in `internal/cloud/gcp/live.go`): GCP exposes **no cheap used-IP count** for a subnetwork — the allocation-ratio insight lives in Network Analyzer behind the **Recommender API** (`google.networkanalyzer.vpcnetwork.ipAddressInsight`; separate SDK + IAM surface + Network Analyzer dependency), there is **no Cloud Monitoring metric** for it, and deriving "used" from instance NICs would need an Instances aggregated fan-out per cycle. So instead of a signal that silently returns -1, the probe/docs contract changed honestly:
- **Live mode is capacity-only**: `TotalIPCount` from the primary CIDR (minus GCP's 4 reserved), new `Subnet.SecondaryIPCount` summing secondary (alias) ranges, `AvailableIPCount` stays -1 — and the probe now FLAGS unmeasured subnets whose primary CIDR is smaller than /26 (warning; threshold configurable end-to-end: the chart's `cloud.gcp.subnetsSmallPrefixThreshold` renders `CHA_CLOUD_PROBE_GCP_SUBNETS_SMALL_PREFIX`, which the catalog feeds into `Subnets.SmallPrefixThreshold` at registration — 0 / unset / invalid = the compiled-in /26 default), pointing at Network Analyzer for the real allocation ratio. Measured mode (snapshot files / future clients with `AvailableIPCount >= 0`) keeps the existing <25%/<10% free-IP thresholds unchanged.
- Probe Detail + README + values.yaml + design-doc claims updated to the capacity-only wording (no more "pending the Monitoring API (v1.9)"); tests cover small-CIDR warn, large-CIDR silent, threshold override, and CIDR-prefix parsing.

**O8 — Silence CRD: UNTIL printer column + status writer (K1 findings).**

- **`kubectl get silences` UNTIL showed `<invalid>`** for every active silence: the printer column was `type: date`, which kubectl renders as age-SINCE — negative for the future expiry an active Silence has by definition. Fixed to `type: string` (raw RFC3339) in all 3 places: the kubebuilder marker (`api/v1alpha1/silence_types.go`), the chart CRD, and the bundle CRD.
- **ACTIVE / MATCHED columns were always empty**: nothing wrote `status.active` / `status.matchCount` despite the CRD comment claiming "status.active flips to false" on expiry. New `pkg/silence/status.go` `UpdateStatuses` (narrow `StatusPatcher` interface, satisfied by the snapshot Mutators): per watcher cycle, `status.active = until > now`, `status.matchCount += this cycle's matches` (running total), `status.lastMatchAt` stamped on match — via merge patch to `/status` (the CRD declares the status subresource; same gotcha as DriftReport reconcile). Writes are cheap: a Silence is patched ONLY when its active flag flipped or it matched this cycle — steady-state cycles patch nothing; failures are soft (collected + logged, never abort the cycle). Wired in `runDiagnose` next to the existing filter using `silence.CountMatches` on the pre-filter diagnostics.
- **New printer-column parity gates** (`internal/operator/crd_printcolumn_parity_test.go`): chart ↔ bundle printer columns pinned per CRD/version; Go `+kubebuilder:printcolumn` markers pinned against the chart CRD; and a `type: date`-on-future-field rule (until/expiry/deadline/notAfter) so the `<invalid>` bug class cannot recur. Status-writer unit tests: active flips on/off, running matchCount + lastMatchAt, no-op patch suppression, soft scoped errors, nil patcher.
- **Operator RBAC**: `BuildReaderClusterRole()` now grants `update`/`patch` on `silences/status` (the chart's `clusterrole-silence.yaml` already did) — without it the status writer 403s on every operator-managed install. The `silences` parent resource stays read-only (SREs own the spec); the stale "only READ by the watcher" builder comment and the chart template's "reserved for a future status-updater" header were rewritten to describe the shipped change-only writer. RBAC builder status-subresource test extended to cover `silences/status`.

### Changed — webhook trigger sources now FAIL CLOSED on missing HMAC secret (P1.1, breaking-ish)

Before this change a `--webhook-source=<name>=<env-var>` whose env var was unset or empty (secret not mounted, ESO key drift, typo, or a spec entry without `=`) silently registered the source with HMAC verification DISABLED — any unauthenticated POST to `/webhook/<name>` triggered a full diagnose cycle (and fixer churn under `--remedy`). Now:

- Registration fails closed: a missing/empty env var or malformed spec logs an `ERROR … source disabled (fail-closed)` and the source is NOT registered (requests 404).
- Defense in depth: should a source ever be registered with an empty secret, the handler rejects every request for it with 401 instead of skipping verification.
- Explicit opt-out: the literal spec `<name>=insecure-no-hmac` registers a deliberately unauthenticated source and logs a loud `UNAUTHENTICATED webhook source` warning at startup.

**Migration:** deployments that (knowingly or not) relied on an empty secret to run an unauthenticated source must either mount a real secret or switch the spec to `<name>=insecure-no-hmac`.

### Fixed — operator: diagnose/remediate CronJobs NEVER succeeded when `spec.alerting` was configured (watch-only flags leaked)

PRODUCTION BUG: the operator's `buildCronJobCommon` appended the watch-only alerting flags (`--alertmanager-url`, `--cluster-name`, `--slack-alerts`, `--slack-critical`) to BOTH CronJobs. `cha diagnose` / `cha remediate` register none of them, so on any operator-managed install with `spec.alerting` set the diagnose/remediate Jobs exited 1 with "unknown flag" on every run — the CronJobs had never succeeded on the live cluster. The chart's `cronjob-diagnose.yaml` / `cronjob-remediate.yaml` were always correct and are the reference shape:

- **diagnose CronJob** now renders `diagnose --live --format=daily` (the previously missing `--format=daily` is what produces the #healthinfo daily digest) plus `--slack-healthinfo=$(SLACK_HEALTHINFO_URL)` when `spec.alerting.slack.healthInfo` is configured; its env carries ONLY `SLACK_HEALTHINFO_URL` (was: all three `SLACK_*_URL`s).
- **remediate CronJob** renders `remediate --live [--dry-run=true]` with no alerting flags and no `SLACK_*` env (mirroring the chart).
- **Bug-class guard** — new `cmd/cha/operatorflags_test.go` builds the watcher Deployment + both CronJobs from the bundle's full-surface sample CR (features force-enabled, resolved through the shared `internal/chartgate.SampleCRFullPath` fixture locator so a future `bundle/tests` move fails loudly in one place) and asserts every operator-rendered arg is registered on the REAL cobra subcommand (`newRootCmd()` in-process) — the operator-render sibling of the v1.23.0 chart↔flags parity gate, so ANY future builder emitting an unregistered flag fails CI instead of CrashLooping in production. Exact-args + role-scoped-env regression tests in `internal/operator/cronjob_args_test.go`.

### Fixed — operator: watcher Deployment carried a `SLACK_HEALTHINFO_URL` secretKeyRef nothing in watch mode reads

Pre-existing operator bug (since the alerting env was introduced, NOT introduced by the CronJob fix above): the builders' shared `alertingEnv` injected `SLACK_HEALTHINFO_URL` onto the WATCHER Deployment, but `cha watch` registers no `--slack-healthinfo` (it is a diagnose-only flag) and nothing reads the env var directly. Because the operator emits a NON-optional `secretKeyRef`, an absent healthinfo secret hard-failed watcher pod creation (`CreateContainerConfigError`) over an env var that could never be consumed. `alertingEnv` now emits only the two channels the watcher actually expands (`SLACK_ALERTS_URL` / `SLACK_CRITICAL_URL`); the diagnose CronJob keeps its `SLACK_HEALTHINFO_URL` via the dedicated `healthinfoEnv`. The Helm chart never had this issue — `watcher-deployment.yaml` renders `cha.slackAlertsEnv` + `cha.slackCriticalEnv` only, and is the reference shape. Pinned by `TestWatcherDeploymentEnv_NoHealthinfoSecretRef`.

### Fixed — operator: `spec.diagnose.backoffLimit: 0` was silently overridden to 1

`DiagnoseSpec.BackoffLimit` was a plain `int32`, so an explicit `backoffLimit: 0` (retry-never — a legitimate posture for a read-only diagnose Job) was indistinguishable from unset and silently replaced with the default 1. The field is now `*int32`: nil (unset) defaults to 1 as before, explicit `0` is honored, explicit `N` passes through. Hand-maintained DeepCopy updated for the pointer; CRD schema is unchanged (`integer`, `minimum: 0` — pointer-ness is a Go-side concern), so the Go↔CRD and bundle↔chart parity gates pin the same shape. `BuildRemediateCronJob` no longer passes a misleading literal `0` (it passes nil — `RemediateSpec` has no backoffLimit knob). Table-driven nil/0/2 regression test in `internal/operator/builders_test.go`.

### Fixed — deployed watcher/aiwatch spammed ~2.5 log lines/sec of `v1 Endpoints is deprecated in v1.33+` client-go warnings

The DNSChainDrift analyzer issued a `Get` on deprecated core/v1 Endpoints per Ingress backend per diagnose cycle (plus the KongRoutes legacy fallback and `cha snapshot capture`); every call made the API server attach the deprecation warning header, which client-go printed verbatim — pure noise drowning real signal. (The watcher's `watchedGVRs` never actually watched core/v1 Endpoints, so the volume was list/get-driven, not watch-driven.)

- **Migrated (mechanical, semantics preserved)** — `DNSChainDrift` now resolves the endpoint layer EndpointSlice-first (`internal/diagnose/dns_chain_drift.go`, new `serviceReadyAddressCount`): lists `discovery.k8s.io/v1` EndpointSlices in the Service namespace, links shards back via the `kubernetes.io/service-name` label, and counts ready addresses (`conditions.ready == nil` is treated as ready per the API contract). The deprecated core/v1 Endpoints `Get` survives ONLY as a fallback when no slice for the Service is visible — old snapshot captures and clusters without the EndpointSlice mirroring controller — keeping pre-migration semantics for those sources. `KongRoutes` (already slice-first since v1.23.0) now reuses the shared `snapshot.GVREndpointSlice`/`GVREndpoints` constants.
- **Watch trigger** — `watchedGVRs` gains `discovery.k8s.io/v1` EndpointSlice, so an endpoint-membership change (pod ready/unready behind a Service) triggers a debounced diagnose cycle directly via the canonical API; a guard test pins that the deprecated core/v1 Endpoints GVR is never (re)added to the watch set.
- **Kept + suppressed (deliberate)** — the remaining legacy reads (DNSChainDrift/KongRoutes fallbacks, `cha snapshot capture` parity for old tooling) are intentional, so `pkg/snapshot.SuppressEndpointsDeprecationWarnings` installs a `rest.Config` WarningHandler that drops ONLY the `v1 Endpoints is deprecated` message and routes every other API-server warning through a deduplicating stderr writer (once per unique message per process instead of once per call). Wired into `internal/snapshot.buildConfig` (LoadLive + BuildKubeClientset), cmd/cha's silence kubeconfig builder, and `pkg/snapshot.NewLiveSource` (applied to a config COPY, only when the caller hasn't installed a handler — this is the constructor cha-com's aiwatch uses, so the paid binary inherits the fix without a code change).
- **Snapshot parity** — `CaptureGVRs` + the File-source kind map gain EndpointSlice so offline diagnose feeds the new slice-first read path; legacy Endpoints stays captured for the fallback path and old tooling.
- **RBAC** — no change needed: both the chart's reader ClusterRole and the operator's `readerPolicyRules()` have carried `discovery.k8s.io/endpointslices` `get/list/watch` since v1.23.1 (verified against the chart↔operator parity gate).
- **Tests** — watcher: EndpointSlice in `watchedGVRs`, never-legacy-Endpoints guard, and an end-to-end `watchGVR` test (fake dynamic client) asserting an EndpointSlice ADDED event reaches the trigger channel; DNSChainDrift: slice-preferred without any legacy object, zero-ready slices NOT overridden by a stale legacy object, nil-ready-counts-as-ready, and legacy-fallback-still-works fixtures; pkg/snapshot: warning filter drops both current and future-version Endpoints deprecation texts, passes other warnings through, dedups passthroughs, respects caller-provided handlers, and never mutates the caller's config.

### Fixed — DNSChainDrift emitted non-enum severities; every DriftReport reconcile cycle failed CRD validation

Production bug: `DNSChainDrift` emitted diagnostics with `severity: "warn"` (duplicate-ingress-host, service-external-name-mismatch) and `severity: "error"` (missing-cloudflare-record, cloudflare-points-elsewhere, missing-ingress, ingress-orphan-service, service-no-endpoints), but the DriftReport CRD enum only allows `info|warning|critical` — so the watcher's driftreport reconcile failed on those subjects every cycle with `spec.severity: Unsupported value: "warn"`.

- **Source fix** (`internal/diagnose/dns_chain_drift.go`) — all seven emit sites now use enum values: `warn` → `warning`, `error` → `critical` (broken-chain findings — host unreachable / traffic dropped — are critical by the same scale the rest of the catalog uses).
- **Defense-in-depth** (`internal/report/driftreport.go`) — new `report.NormalizeSeverity(severity, source)` applied at the single choke point in `Reconcile` where both the create spec and the per-cycle spec-refresh patch are built: `warn`→`warning`, `error`/`err`/`fatal`/`crit`→`critical`, empty→`warning` (the existing AssembleEntries default), anything else→`warning` with a log line naming the offending source. A future emitter with a bad literal can no longer break reconcile.
- **Guard tests** (`internal/report/severity_test.go`) — (1) a table-driven regression test for the normalizer mapping; (2) `TestReconcile_NormalizesNonEnumSeverity` asserting both the create path and the spec-patch path send enum values; (3) `TestSeverityLiteralsAreEnumValues`, a static AST lint that walks every non-test `.go` file under `internal/`, `catalog/`, `pkg/`, `cmd/`, `api/` and fails on any `Severity` string literal outside the enum — this test caught exactly the seven production sites before the fix.

### Fixed — chart: silence ClusterRoleBinding bound the wrong ServiceAccount (live-verification finding)

The chart's `clusterrole-silence` binding referenced the watcher SA via `cha.fullname` instead of `cha.serviceAccountName` (`<fullname>-sa`) — the SA the watcher Deployment actually runs as. So on chart installs the watcher could not `list silences`, and silence-filtering was **skipped on every diagnose cycle** (live symptom: `silences.cha.bionicaisolutions.com is forbidden`). Found by deploying the merged build to a real (RBAC-enforcing) kind cluster; unit tests missed it because the chart↔operator RBAC parity test excludes the `cha.bionicaisolutions.com` group. Fixed the binding + added `internal/operator/chart_watcher_binding_sa_test.go` asserting every watcher read-role binding uses `cha.serviceAccountName`.

### Fixed — watcher: pending approval-URL cache grew unbounded (P1.9)

The `pendingURLs` map (approval URLs keyed by ActionID for the AI tier) evicted entries only on lookup (`approvalURLFor`). A recorded-but-never-rendered ActionID — e.g. a diagnostic that resolved before its next post — persisted for the whole process lifetime, a slow memory leak on long-running watchers with the AI tier enabled. `recordApprovalURL` now sweeps entries older than a 24h TTL on every insert (and lookup still evicts on access), via an injectable clock seam.

### Fixed — operator: cross-namespace approval events Role/RoleBinding leaked on CR deletion (P1.9)

When a CR pinned `spec.approval.auditNamespace` to a namespace other than its own, the operator created the `<name>-events` Role + RoleBinding there **without** an ownerRef (cross-namespace ownerRefs are illegal), so Kubernetes GC never reaped them. Teardown only ran on disable-while-alive — a straight `kubectl delete` of the CR skipped that path, leaking the cross-namespace RBAC pair for the cluster's lifetime. The operator's finalizer now also deletes those objects (NotFound ignored, so the same-namespace owner-ref'd case is a harmless no-op).

### Fixed — feeder: workload digest index collided across workloads in a namespace (P1.6)

The workload feeder's pod-digest index was keyed by (namespace, container-name) only, despite a comment claiming it was scoped to the owning controller. Two workloads in one namespace that both name their container e.g. `app` (extremely common) silently received each other's `image_digest` — first pod observed won — so a digest-pin PR proposal built downstream could previously cite a **sibling workload's digest** and pin the wrong image. The index is now scoped to the owning workload (each pod's controller ownerReference, with Deployment names recovered from the ReplicaSet `<deployment>-<pod-template-hash>` convention), and as a second guard a digest only attaches when the repo it was pulled from matches the workload's declared image repo (so a mid-rollout pod still running the old repo's image can no longer stamp its digest onto the new spec). Pods whose owner can't be resolved (bare pods, Jobs, bare ReplicaSets) now contribute no digest — fail-closed; the entry simply omits `image_digest` until a resolvable pod is observed.

### Fixed — operator: `spec.externalDNS` was accepted but did nothing (P1.5)

The CRD documented `spec.externalDNS.cloudflare.*` (incl. `apiTokenSecretRef`) and the operator accepted it — but consumed it nowhere. The DNSChainDrift analyzer only wires its Cloudflare client when `CHA_CLOUDFLARE_TOKEN` is set at registration time, and nothing supplied that env on operator-managed installs, so external-hop DNS verification silently never ran. The operator's watcher Deployment now injects `CHA_CLOUDFLARE_TOKEN` via `secretKeyRef` from `apiTokenSecretRef.{name,key}` (key defaults to `token`) when `cloudflare.enabled=true`. The token value never appears in any manifest.

### Fixed — operator: `spec.watcher.triggers.webhook.serviceEnabled` was accepted but did nothing (P1.5)

The chart has shipped `watcher-webhook-service.yaml` since v1.23.0, but the operator built neither the ClusterIP Service nor the named `webhook` containerPort — an operator-managed webhook receiver was reachable only by pod IP. The operator now reconciles a `<cr>-webhook` ClusterIP Service (port = `servicePort`, default 8090; `targetPort: webhook`; selects the watcher pods) when `serviceEnabled=true`, owner-ref'd to the CR and torn down when the field flips off or the watcher is disabled, and declares the `webhook` containerPort whenever `webhook.listen` is set — both mirroring the chart's semantics exactly.

## [1.25.1] — 2026-06-11

### Fixed — goreleaser disk-OOM on GH-hosted runner

v1.25.0 goreleaser failed at the docker buildx multi-arch build stage with `no space left on device`. The OSS workflow's transitive deps (AWS SDK v2 + k8s.io + buildx cache) overshoot the ~14 GiB free disk on the GH-hosted runner. v1.24.x and earlier just happened to fit; v1.25.0's added KEDA + extra ownerRef walker pushed past the limit.

Same fix that the CHA-com workflow shipped in v1.20.0: pre-checkout cleanup step removes ~25 GiB of preinstalled .NET / Android SDK / Haskell / Swift / CodeQL toolchains that the workflow doesn't use.

Chart 1.25.0 was published successfully to gh-pages before goreleaser exited; this patch re-publishes the chart at 1.25.1 alongside the new image so operators always pull a coherent pair. No code changes — v1.25.0 and v1.25.1 ship byte-identical Go binaries.

### Added — `spec.remediate.activeDeadlineSeconds`

The diagnose CronJob already had `spec.diagnose.activeDeadlineSeconds` (default 300s). The remediate counterpart was hardcoded at 120s in the operator builder. Busy clusters with many SecurityDrift proposals + DigestPin candidates queued up routinely overshoot 120s and hit BackoffLimitExceeded. Live observation on the dev cluster (2026-06-11): 4 of 4 most-recent runs had `cond: Failed=True reason=BackoffLimitExceeded`.

Operators can now set `spec.remediate.activeDeadlineSeconds: 900` (or whatever their workload needs). Default 120s preserved for low-finding clusters where it's fine.

## [1.25.0] — 2026-06-11

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

## [1.24.1] — 2026-06-10

### Fixed — CRD schema for `spec.watcher.triggers` (v1.24.0 was unusable on schema-strict K8s)

v1.24.0 added the Go types + operator reconciler for `spec.watcher.triggers.{prom,webhook}` but did NOT update the CRD's OpenAPIv3 schema. K8s 1.27+ structural-schema pruning stripped the field at the API server, so any `kubectl apply` of a CR with `triggers` set silently dropped the data. The operator then rendered the watcher Deployment with no trigger args.

This patch adds the matching schema to both `bundle/manifests/cha.bionicaisolutions.com_clusterhealthautopilots.yaml` and `charts/cluster-health-autopilot/templates/crd-clusterhealthautopilot.yaml`. Verified live: `kubectl explain clusterhealthautopilots.spec.watcher.triggers` now resolves and the field persists on `kubectl get`.

Caught during live activation of M5 on the dev cluster (kubectl apply succeeded with a warning, but the field was stripped silently — operator rendered no trigger args).

## [1.24.0] — 2026-06-10

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

## [1.23.1] — 2026-06-10

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

