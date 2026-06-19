<!-- DO NOT EDIT — vendored snapshot of CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- source: CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- synced: 2026-06-19 -->
<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->
<!-- truncated to newest 12 release sections; the public roadmap renders these only -->

## [0.2.0-alpha.1] — 2026-06-19

### Added

- Firecrawl-grounded deep-RCA LLM investigator: performs structured root-cause
  analysis using live public web research (read-only cluster tools + web
  research via an LLM-synthesized, client-redacted query). Flags:
  `--firecrawl-endpoint`, `--firecrawl-enabled`, `--firecrawl-api-key-env`,
  `--investigator-web-timeout`. API key read from K8s Secret `cha-firecrawl-key`.
- Deep-RCA artifact persisted to `cha_investigations` Qdrant collection;
  cross-cycle retrieval injects prior root-cause context into the T1 proposer.
- Root-cause forwarded into every AI tier (T0–T3) via a `<root_cause>` prompt
  block so all tiers reason from the same root cause; T1 also receives T0
  enrichment in the same block.
- Ticket-closure outcome recorded to RAG/audit store
  (`verdict=cleared, delivery=ticket-closed`) so future short-circuit lookups
  benefit from resolved findings.

### Changed

- `--rag-short-circuit` now defaults **ON** (previously default off). Inert
  without `--memory-store-url`.
- OSS dependency remains pinned to **v1.26.3** (no bump — the new code uses
  only existing OSS symbols).

## [0.1.0-alpha.1] — 2026-06-18

**Version re-baseline.** Pre-launch project; releases through v1.22.4 were
internal pre-alpha iterations mis-numbered as 1.x. Reset to SemVer 0.x with
`-alpha.N` pre-releases. No code change — 0.1.0-alpha.1 is the v1.22.4 tree
under honest numbering.

For continuity, the content shipped at v1.22.4 (the tree this re-baseline
points at):

### Added — one-click Silence (SC: the CHA-com half)

The AI digest's "🚫 AI declined" / "⏳ Awaiting your approval" items now
carry two signed one-click Silence links — **🔕 Silence 24h** (subject-scoped,
matcher `{source, subject}`) and **🔕 Silence class (90d)** (class-scoped,
matcher `{source}` + optional `messagePattern`). Links are minted via the OSS
`pkgai.MintSilenceLinks` (signed with the approval-server's Ed25519 key) and
carried on `proposalRecord`. A new approval-server endpoint
**`GET /silence?token=<JWS>`** verifies the signed token, enforces one-time
use via the replay store (`silence:` JTI namespace), rate-budgets the click,
then materializes a real OSS **`Silence` CR**
(`cha.bionicaisolutions.com/v1alpha1`) via a dynamic client on the `silences`
GVR. Fail-closed throughout; audited as `ai.approval.silenced`. The 90d
class-silence link supersedes the legacy 7d `ActionSilenceClassURL`.

### Changed

- OSS dependency pinned to **v1.26.3** (adds `pkgai.SilenceTokenClaims` +
  `SignSilenceToken`/`VerifySilenceToken` + `MintSilenceLinks`, the
  approval-server `silences` create RBAC, and the `/silence` Ingress path).

## [1.22.4] — 2026-06-17

### Added — one-click Silence (SC: the CHA-com half)

The AI digest's "🚫 AI declined" items (and "⏳ Awaiting your approval"
items) were linkless — an operator who decided a decline was *by design*
had no way to mute it without leaving Slack. They now carry two signed
one-click Silence links:

- **🔕 Silence 24h** — subject-scoped: snoozes THIS finding
  (matcher `{source, subject}`) for `--silence-short-duration` (default 24h).
- **🔕 Silence class (90d)** — class-scoped: mutes the finding's whole
  `Source` (matcher `{source}`, optional `messagePattern`) for
  `--silence-long-duration` (default 2160h / 90d).

Links are minted via the OSS `pkgai.MintSilenceLinks` (signed with the
same Ed25519 key the approval-server verifies) and carried on
`proposalRecord` (`SilenceSubjectURL` / `SilenceClassURL`).

New approval-server endpoint **`GET /silence?token=<JWS>`** verifies the
signed token (`pkgai.VerifySilenceToken`, reusing the verifier's public
key), enforces one-time use via the shared replay store (under a
`silence:` JTI namespace; replay → 409), rate-budgets the click (class
`silence`, mirrors `/approve`), then materializes the verified claims
into a real OSS **`Silence` CR** (`cha.bionicaisolutions.com/v1alpha1`)
in the approval-server's own namespace. The CR is created via a dynamic
client on the `silences` GVR (no controller-runtime dependency added);
the SA gained `silences` create/get/list in OSS v1.26.3. CR name is a
deterministic hash of the matcher + window, so an idempotent re-click is
treated as success (`AlreadyExists` → 200). Fail-closed throughout:
bad/expired/tampered token, replay, store error, or RBAC failure leave
nothing half-done. Audited as `ai.approval.silenced`.

The new 90d class-silence link **supersedes** the legacy 7d
`ActionSilenceClassURL` class-silence line — they are never rendered
together, so there is no duplicate class-silence button.

### Changed

- OSS dependency bumped to **v1.26.3** (adds `pkgai.SilenceTokenClaims`
  + `SignSilenceToken`/`VerifySilenceToken` + `MintSilenceLinks`, the
  approval-server `silences` create RBAC, and the `/silence` Ingress
  path).

## [1.22.3] — 2026-06-17

### Fixed — human-approved executions spuriously failing on missing rollback (OF1/CF1)

`MutatorExecutor.Execute` re-validated the proposal it RECONSTRUCTS from
the signed approval token by calling the full `(*AIProposedAction).Validate()`.
That token intentionally omits the rollback description (a creation-time
quality gate enforced at proposal mint + shown to the approver), so
`Validate()` always failed with `ErrMissingRollback` ("ai proposal lacks
rollback info") — every human-approved (token-based) execution of a
`DeletePod`/`DeleteJob`/`PatchDeployment`/etc. action errored before
reaching the mutator. The executor now calls the new OSS
`(*AIProposedAction).ValidateForExecution()` (full Validate MINUS the
rollback-description requirement); all other safety/structural invariants
are still enforced and the protected-namespace admission check still runs
separately. The autonomy auto-apply path keeps its OWN independent
`Rollback.Description == ""` rejection gate (`DecideAutonomy` /
`DecideAutonomyWithInputs`) — auto-apply still requires a rollback and is
unaffected by this change.

### Changed — OSS dependency → v1.26.2

Bumped `github.com/Bionic-AI-Solutions/cluster-health-autopilot` to
`v1.26.2`, which adds `(*AIProposedAction).ValidateForExecution()`.

## [1.22.2] — 2026-06-12

### Fixed — goreleaser `extra_files` missing `federation/` + `ticketing/` (v1.22.1 image context incomplete)

Same failure class as v1.22.0, second location: goreleaser builds docker
images from a minimal context listing `dockers[].extra_files`, and that
allowlist also predated the P6 packages — the v1.22.1 build failed with
`"/federation": not found` at context-checksum time. Both per-platform
`extra_files` blocks now carry `federation` and `ticketing`.
`scripts/dockerfile-copy-check.sh` extended to verify EVERY
`extra_files` block independently (a dir present for amd64 but missing
for arm64 still breaks the release) — negative-tested. v1.22.2 is the
first buildable image of the 1.22 line; Go code identical to v1.22.0.

## [1.22.1] — 2026-06-12

### Fixed — Dockerfile missing `federation/` and `ticketing/` (v1.22.0 image unbuildable)

The builder stage COPYs an explicit directory allowlist that predated the
P6 work: `federation/` and `ticketing/` (Jira + ServiceNow sinks) were
never added, so the v1.22.0 Docker image failed to build with
"no required module provides package …/federation" while host builds
passed. The v1.22.0 tag therefore shipped no image; v1.22.1 is the first
buildable release of the 1.22 line and carries identical Go code.

### Added — Dockerfile COPY-allowlist gate

`scripts/dockerfile-copy-check.sh` (wired into CI) compares the
Dockerfile's COPY allowlist against `go list -deps ./cmd/cha-com` and
fails when the binary imports an in-module top-level directory the image
build would not receive — the v1.22.0 failure class, now load-bearing.

## [1.22.0] — 2026-06-12

Release-pairs with OSS `v1.26.0`. Rolls up everything since v1.21.0: the
P6 paid-tier program (Loki/OTLP compliance sinks, SBOM + cosign supply
chain, Jira + ServiceNow ticketing, hosted dashboard, multi-cluster
federation), the C1–C7 hardening line (T2 prerequisite ordering,
attestation-verified auto-merge, approver rate budgets, native Anthropic
client, cloud-aware RCA, one-shot class tokens), and the release prep
(OSS v1.26.0 pin + the hash-chain primitive moving to OSS `pkg/audit`).
Grouped Added / Changed / Security below.

### Added — RAG-first short-circuit: reuse a high-confidence cleared prior, skip the LLM (G1)

Implements the owner's #1 stated product differentiator: *"RAG first →
investigate → fix → test → store … so that investigation need not be run from
scratch every time."* The fix→test→store backbone already existed; what was
missing was the **reuse** of a known-good prior to skip the expensive LLM
investigation/proposal.

When `--rag-short-circuit` is set (default **off**, P3.3 default-off
discipline), the T1 fix proposer first asks the RAG memory layer whether a
previously-**cleared** remediation exists for the *same finding class*
(`Source`) at cosine similarity `>= --rag-short-circuit-threshold` (default
**0.92**) **and** carrying a *replayable* action. If so, the proposer rebuilds
that exact proposal and **skips the LLM call entirely**.

The reused proposal is not trusted blindly — it flows through every existing
downstream gate unchanged: the **G6 precondition re-check** (finding still
present at apply time), the **autonomy confidence gate**, the **post-apply
verifier** (the TEST leg), and the **outcome recorder** (so the chain keeps
learning). Only the LLM derivation is removed, never a safety check. A
`ai.proposal.reused_prior` audit event (with the prior's correlation id +
similarity) is emitted to the tamper-evident log when the short-circuit fires;
a rebuilt-but-invalid prior emits `ai.proposal.reuse_rejected` and falls
through to the LLM.

**Make-or-break data-model change.** Stored outcomes previously persisted only
`ActionKind` + `Target` + verdict/rationale — **not** the patch/manifest/PR
payload, so a `PatchDeployment` / `ApplyManifest` / `ProposePullRequest` prior
could not be faithfully replayed. This change extends `memory.Resolution` and
`approval.Outcome` with `PatchPayload`, `ManifestYAML`, `PullRequestURL`, and
`RollbackDescription` (byte payloads stored base64-encoded in Qdrant and
decoded on retrieval). **Consequence:** the short-circuit only benefits from
outcomes recorded by this version or later; pre-G1 priors lack the payload and
deliberately fall through to the LLM (legacy `Delete*` priors, which need no
payload, also fall through unless they carry a stored `RollbackDescription`).

Safety bounds against replaying a stale/wrong fix: (1) only `verdict=cleared`
priors are eligible — a `still-present`/`denied`/`reverted` prior is never
replayed; (2) same `Source` (analyzer-class) required, so a cleared
StaleErrorPods fix can't replay onto a CertRequest finding at high text
similarity; (3) the high 0.92 default similarity floor; (4) the rebuilt
proposal must pass the same `Validate()` the LLM path enforces; (5) the live
G6 precondition re-check + post-apply verify still run before/after apply.

New flags: `--rag-short-circuit` (bool, default false) and
`--rag-short-circuit-threshold` (float, default 0.92). The chart/operator
surface these via `extraArgs` in the OSS chart repo (separate PR); no value
change ships in this (binary) repo.

### Added — Loki / OTLP / Stdout audit sinks for compliance pipelines (P6.1)

Implemented the off-box audit sinks the website advertises ("Loki / OTLP
sinks for compliance pipelines (paid)") and that `ai/audit/doc.go`'s
contract had only described as intended:

- **`StdoutSink`** (`ai/audit/stdout.go`) — one structured JSON line per
  event to an `io.Writer` (default `os.Stdout`), for sidecar log
  collectors (Vector / fluent-bit / the cluster stdout scraper).
- **`LokiSink`** (`ai/audit/loki.go`) — POSTs to the Loki push API
  (`/loki/api/v1/push`) with stream labels `{job="cha-ai", tier, event_type}`
  and the redacted event JSON as the ns-timestamped log line.
- **`OTLPSink`** (`ai/audit/otlp.go`) — OTLP/HTTP logs export (hand-built
  JSON, no heavy OTel SDK) to `<endpoint>/v1/logs`: `resourceLogs[]` →
  `scopeLogs[]` → `logRecords[]` with `timeUnixNano`, `severityText=INFO`,
  `body.stringValue` = redacted event JSON, and Type/Tier/Actor/Subject/
  CorrelationID as log-record attributes.
- **`AsyncSink`** (`ai/audit/async.go`) — bounded, non-blocking buffered
  decorator: `Write` enqueues and returns immediately, a background worker
  drains, buffer overflow drops + counts (throttled warning), `Close`
  flushes. The CLI wraps the network sinks in it so a slow/hung gateway
  can never stall the watcher cycle.

All network sinks share the CHA-com HTTP conventions: an injected
`*http.Client` (nil → default), a 15s timeout, soft-fail (a sink error
degrades audit, never the action — the chained JSONL remains the only
hard fan-out dependency via `MultiSink`), and secret-like `Details`
values redacted via `pkg/ai.ContainsSecretLike` **before** anything
crosses the wire (`ai/audit/redact.go`).

Wired via new flags on `watch` / `diagnose` / `approval-server`:
`--ai-audit-loki-url`, `--ai-audit-otlp-endpoint` (both default unset =
off). When set they fan out alongside the existing chained JSONL +
Kubernetes Events `MultiSink`.

### Added — CycloneDX SBOM + cosign keyless image signing + attestation (P6.2)

Mirrors the OSS P6.2 supply-chain work so paired releases ship identical provenance, fulfilling the website's "SBOM (paid)" and "Cosign-signed container images with attestation" claims for the paid tier. `.goreleaser.yaml` gains `sboms:` (syft → one **CycloneDX JSON** SBOM per `cha-com` binary archive), `signs:` (cosign **keyless** `sign-blob` over `checksums.txt` → `checksums.txt.sigstore.json`), and `docker_signs:` (cosign **keyless** `sign` over every `docker4zerocool/cha-com` + `ghcr.io/bionic-ai-solutions/cha-com` image + manifest, logged to Rekor). Keyless via the workflow's GitHub OIDC token (`id-token: write`, previously "reserved for future" — wired now) → short-lived Fulcio cert; no key on disk. The release workflow installs syft + cosign (`anchore/sbom-action`, `sigstore/cosign-installer`); it already ran goreleaser with `--timeout 2h`. The CHA-com repo + Releases are private, but the image registries are **public**, so customers verify image signatures without repo access. New `docs/RELEASE_VERIFICATION.md` gives the `cosign verify` / `verify-blob` + SBOM-inspection commands. Verified locally: `goreleaser check` passes and `goreleaser release --snapshot` produces four valid CycloneDX SBOMs; signing pipes only execute in CI under a real OIDC token.

### Added — Jira Cloud REST ticketing sink (paid Enterprise tier) (P6.3)

Implemented the Jira ticketing sink the website advertises ("Jira … in the
paid Enterprise tier"), fulfilling **M3** of the ticketing design
(`pkg/ticketing/docs/design/2026-05-ticketing-mcp-integration.md` in OSS).
Today only OpenProject (OSS) existed; CHA-com now adds Jira.

- **`ticketing/jira/`** — implements the OSS `pkg/ticketing.Sink`
  interface (`Upsert` / `Resolve` / `Comment` / `Provider() = "jira"`)
  against the **Jira Cloud REST API v3**. Transport is REST direct (no
  Atlassian MCP server is deployed in-cluster); `client.go` injects an
  `*http.Client` (20s default timeout) and a `nopClient` for dry-run,
  mirroring the OpenProject sink's structure.
- **Auth:** HTTP Basic (email + API token). The token is sourced ONLY
  from an env var (`CHA_JIRA_TOKEN`, the Helm chart wires it from a
  secret-ref) — never a flag literal or manifest value — and only ever
  flows into the `Authorization` header. A unit test asserts the token
  never appears in any log line the sink emits.
- **Idempotency:** `Upsert` searches Jira (JQL `labels = cha-<fingerprint>`)
  before creating; an existing issue's ref is returned with no duplicate
  POST. The `cha-<fingerprint>` label (OSS `ticketing.Fingerprint`) is
  attached to every issue so the dedup is durable across CHA restarts.
- **Field mapping:** Ticket → `{project.key, issuetype (Task), summary,
  description (ADF), labels incl. fingerprint, priority}`. Severity →
  Jira priority NAME via operator-overridable map (critical→Highest,
  warning→High, info→Medium per the design doc).
- **`Resolve`:** `GET /transitions`, picks the Done/Resolved transition,
  `POST /transitions`, then comments the reason. No matching transition
  (already terminal) is a clean no-op.
- **Provider selection** wired into `cha-com watch` via
  `cmd/cha-com/ticketing_wiring.go`: `--ticketing-provider=jira` (env
  `TICKETING_PROVIDER`) constructs the sink; empty = ticketing off.
  Because the OSS `internal/report.RouteTickets` path is internal and
  not importable, CHA-com owns a small `ticketingRouter` that files an
  issue for each first-appearance unfixable diagnostic and transitions
  it to Done when the subject clears (in-memory ref bookkeeping keyed by
  fingerprint, matching the watcher's own `seen`-map lifecycle).
- **Chart note:** the required values live in the OSS chart under
  `ticketing.provider=jira` + `ticketing.jira.{url,project,email}` and a
  `ticketing.jira.tokenSecretRef` → env `CHA_JIRA_TOKEN`. CHA-com reads
  those envs (`CHA_JIRA_URL` / `CHA_JIRA_PROJECT` / `CHA_JIRA_EMAIL` /
  `CHA_JIRA_TOKEN`) the chart sets; no secret value is ever hardcoded.

Verified: `go build ./... && go vet ./... && go test ./... -count=1`
green; `go test ./ticketing/... -race` green; gofmt clean on new files.

### Added — ServiceNow Table API ticketing sink + namespace-based multi-sink routing (paid Enterprise tier) (P6.4)

Implemented the ServiceNow ticketing sink the website advertises
("ServiceNow … in Enterprise"), fulfilling **M4** of the ticketing design
(`pkg/ticketing/docs/design/2026-05-ticketing-mcp-integration.md` in OSS),
and added the multi-sink routing the design's M6 calls for. Mirrors the
P6.3 Jira sink structure.

- **`ticketing/servicenow/`** — implements the OSS `pkg/ticketing.Sink`
  interface (`Upsert` / `Resolve` / `Comment` / `Provider() = "servicenow"`)
  against the **ServiceNow Table API** (`/api/now/table/incident`).
  Transport is REST direct (no ServiceNow MCP server in-cluster);
  `client.go` injects an `*http.Client` (20s default timeout) and a
  `nopClient` for dry-run.
- **Auth:** HTTP Basic (`CHA_SERVICENOW_USER` + `CHA_SERVICENOW_PASSWORD`)
  by default, OR an OAuth bearer (`CHA_SERVICENOW_BEARER`) when set
  (bearer wins). The password / bearer are sourced ONLY from env vars
  (the Helm chart wires them from secret-refs) — never a flag literal or
  manifest value — and only ever flow into the `Authorization` header. A
  unit test asserts the password (raw + base64) never appears in any log
  line the sink emits.
- **Idempotency:** `Upsert` queries the incident table by the stable
  `correlation_id=cha-<fingerprint>` (OSS `ticketing.Fingerprint`) before
  writing; a match is PATCHed in place (no duplicate POST), else a new
  incident is POSTed. Durable across CHA restarts.
- **Field mapping:** Ticket → `{short_description=Title, description=Body,
  urgency+impact from severity via operator-overridable code maps,
  correlation_id=fingerprint}`. `TicketRef.Key` is the incident number
  (e.g. `INC0012345`); `TicketRef.URL` is the
  `…/nav_to.do?uri=incident.do?sys_id=<sys_id>` deep-link.
- **`Resolve`:** reads current `state`; if already Resolved (6) / Closed
  (7) / Canceled (8) it is a clean no-op, else PATCHes `state=6` +
  `close_notes=reason` (+ `close_code`). **`Comment`:** PATCHes
  `work_notes` (journal append).
- **Multi-sink routing (M6):** new `--ticketing-route`
  (`"kube-system=servicenow,default=jira"`, env `CHA_TICKETING_ROUTE`)
  routes each finding to a provider by the namespace parsed from its
  Subject (`Kind/ns/name`); any namespace not listed falls back to
  `--ticketing-provider`. The router builds each named provider's sink
  once at startup and reuses it; a route to an **unconfigured or unknown
  provider fails at startup**, not per-finding. `Resolve` goes back
  through the same provider that filed the ticket (recorded on the stored
  `TicketRef.Provider`).
- **Provider selection** wired into `cha-com watch` via
  `cmd/cha-com/ticketing_wiring.go`: `--ticketing-provider=servicenow`
  constructs the sink; the switch now supports `jira` + `servicenow`.
- **Secrets:** no credential is ever a flag literal or hardcoded; all
  flow through env vars the chart populates from secret-refs.

Verified: `go build ./... && go vet ./... && go test ./... -count=1`
green; `go test ./ticketing/... ./cmd/cha-com/... -race -count=1` green;
gofmt clean on new files.

### Added — read-only hosted dashboard MVP (paid tier) (P6.6)

Implemented the **Hosted dashboard** the website advertises in the paid
tier. Server-rendered HTML (no SPA framework, no client-side JS), built
with `html/template` (auto-escaped — all cluster + audit data is treated
as untrusted) and a minimal embedded dark stylesheet matching the product.
It is **read-only**: it shows state and links out to the EXISTING
approval-server endpoints for any action — it never mutates the cluster.

- **`ai/dashboard/`** — new package. `Server` mirrors the approval-server
  HTTP conventions (`http.NewServeMux`, HTML responses, `X-Forwarded-User`
  for the displayed operator identity, `/healthz` + `/readyz`). Pages:
  - `GET /` (and `/dashboard`) — overview: active DriftReport counts by
    severity (live cluster), remediation clear-rate, and pending-approval
    count (from the audit log).
  - `GET /findings` — table of current DriftReports
    (`driftreports.cha.bionicaisolutions.com`) read **live** from the
    cluster via an injected `FindingsReader` (satisfied by the OSS
    `snapshot.LiveSource`; tests inject a fake). Columns: severity / source /
    subject / message / observation-count / age. Sorted critical→warning→info.
  - `GET /approvals` — recent proposals with **Approve / Deny / Ignore**
    links pointing at the existing `/approve`, `/deny`, and `/silence-class`
    (Ignore) endpoints on `--approval-base-url`. **Honest scope:** the
    approval-server does not persist a list of currently-pending signed
    tokens (the one-click JWT lives only in the Slack message; the replay
    store records only *used* JTIs), so this page shows recent
    `ai.proposal.created` audit events with their resolved outcome
    (pending / applied / cleared / denied / failed) and the action links
    target the endpoint roots — the operator completes the action from the
    token-bearing Slack link. The page states this explicitly.
  - `GET /history` — remediation outcomes derived from the audit JSONL
    (the P2.1 ChainedSink output, read via `ai/audit.ReadChainedJSONL`):
    subject, action, tier, approver, and verdict
    (cleared / applied / failed / skipped / denied).
  - `GET /healthz`, `GET /readyz`.
- **`cha-com dashboard`** — new subcommand (mirrors `approval-server`'s
  construction). A **separate subcommand** rather than a flag on
  `approval-server` was chosen as the simpler, cleaner option: the
  dashboard is read-only with a distinct RBAC posture (driftreport READ,
  no signing key, no mutate verbs), runs as its own Deployment/Service, and
  keeping it separate avoids coupling read-only HTML serving to the
  mutating approval path. Flags: `--listen` (default `:8444`),
  `--approval-base-url` (required), `--ai-audit-log`, `--auth-header`,
  `--history-limit`, `--approvals-limit`. Covered by the command-tree
  `--help` smoke test via `newRootCmd()`.
- **XSS safety:** every interpolated cluster/audit value is rendered through
  `html/template` (never `text/template`); a DriftReport subject of
  `<script>` renders as `&lt;script&gt;`. A unit test asserts raw
  `<script>`/`<img onerror>` never appears in the output and the escaped
  form does.
- **Auth posture:** designed to sit behind oauth2-proxy at the Ingress
  (which authenticates the operator and sets `X-Forwarded-User`, read purely
  for display). Direct pod access should be restricted by the same
  NetworkPolicy class as the approval-server (OSS P2.6b).

**Deferred (follow-ups, not in this MVP):**
- OSS chart/operator RBAC for a dedicated `cha-dashboard-sa` (cluster-wide
  GET/LIST on `driftreports`, optionally `resolutionrecords`) and a
  NetworkPolicy covering the new dashboard Service — documented in the
  subcommand doc; to be wired in the OSS repo.
- Live pending-token listing on `/approvals` (would require the
  approval-server to persist outstanding proposals).
- Pagination / filtering / time-range selection; per-namespace scoping.

### Added — multi-cluster federation MVP (paid tier, read-only) (P6.7)

Implemented the **Multi-cluster federation** the website advertises in the
paid tier — as an **honest, read-only MVP**. Hub-spoke **PULL** model: the
hub holds a kubeconfig per member ("spoke") cluster (mounted from K8s
Secrets, never literal) and builds a **LIVE** `snapshot.Source` per member,
feeding the existing `catalog.MultiClusterDrift` analyzer with live peers
(replacing the old pre-captured, offline snapshot injection). Design doc:
`docs/design/2026-06-federation-mvp.md`.

- **`federation/`** — new package.
  - `Member{Name, Kubeconfig []byte}` — one spoke; kubeconfig bytes sourced
    from a mounted K8s Secret and **never logged**.
  - `BuildPeerSources` / `buildPeerSources(ctx, members, builder, log)` —
    builds a live read-only peer `snapshot.Source` per member via an
    injectable `SourceBuilder` seam (production = `LiveSourceBuilder`:
    `clientcmd.RESTConfigFromKubeConfig` → `dynamic.Interface` → read-only
    wrapper; tests pass a fake builder, no API server stood up).
    **Fail-open per member, fail-closed overall**: a member whose kubeconfig
    fails to load is skipped with a name+error log line; only when **every**
    member fails is an error returned.
  - `dynPeerSource` + `readOnlyPeer` — federated peers implement **only**
    `List`/`Get`/`Mode`; they never satisfy `snapshot.Mutator`, so the hub
    **cannot mutate a member cluster** (enforced at the type level).
  - `Poller` — refreshes the peer set on an interval, exposes the current
    `[]catalog.Peer` to the watch loop; concurrency-safe `Peers()`/`Refresh()`.
- **`cha-com watch`** — new `--federation-members <dir>` flag (+
  `--federation-interval`). Each file in the directory is one member's
  kubeconfig (filename = member name); K8s Secret-mount machinery (`..data`,
  dotfiles, subdirs) is skipped. **OFF by default** — unset = local-only
  diagnosis, byte-identical to today. When set, each tick runs
  `MultiClusterDrift` against the live peers **in addition to** the local
  registry run.
- **Per-cluster attribution** — federated findings are labeled
  `cluster=<member>` on their Subject (so the watch + ticketing fingerprints
  are distinct per member, and the operator knows WHICH cluster drifted).
- **Honest scope / non-goals**: read-only aggregation + drift compare only.
  **No cross-cluster mutation.** No cross-cluster DriftReport write-back, no
  member sharding across hub replicas, no dashboard cluster selector (P6.6
  follow-up), no multi-account cloud federation (cloud-probe v2). The hub
  needs only **read RBAC** on each member (a read-scoped SA token kubeconfig).

### Added — per-(approver, class) rate budget on approval executions

The website + one-pager promise a "per-(approver, class) rate budget",
but `ai/rate_limit.go` keyed its token bucket by class only — and the
approval-server execution paths were not budgeted at all (before this PR
the limiter had no production callers at all: `NewLimitedFixProposer` is
defined but unwired). Approval executions are now budgeted per (approver,
class), so one approver exhausting a class budget never starves another
approver, and one approver's clicks are budgeted independently per
class.

- **`RateLimiter.TakeApproval(approver, class)`** (`ai/rate_limit.go`)
  — new budgeted operation keyed `(approver, class)` (NUL-joined key, a
  byte impossible in an HTTP header, so crafted approver/class pairs
  cannot alias another pair's bucket). Empty approver degrades to a
  class-only key — call sites without an approver in scope (autonomous
  investigation/proposal cycles) never fabricate one and keep their
  exact legacy keying. Capacity + refill reuse the existing
  investigation budget configuration — `InvestigationsPerHour` default
  (10/h) with `PerInvestigationClass` overrides — applied PER APPROVER.
  No new flags, required or otherwise.
- **Cold-start exception** — approval buckets always start FULL,
  regardless of `ColdStartFull`. The zero-token cold start defends
  autonomous LLM spend against pod-restart burst storms; the approval
  click path is an ingress-authenticated human holding a single-use
  signed token, and a zero-token start would lock every approver out
  for one full refill interval after each approval-server restart.
- **Gated handlers** — `/approve` (class dimension = the proposal's
  `ActionKind`; the signed proposal token does not carry the diagnostic
  class) and `/approve-class` (class dimension = the diagnostic class,
  i.e. the class token's `Source`). The approver is the
  ingress-authenticated OIDC identity the handlers already require
  (`X-Forwarded-User` by default; 401 when absent). `/deny`,
  `/silence-class`, `/deny-class`, and the T3 runbook recording path
  execute nothing and are NOT budgeted.
- **Fail-closed AND lossless** — the gate runs after the T2
  prerequisite gate (a blocked step burns no budget) and BEFORE the JTI
  burn / policy write, so a rate-limited click consumes NOTHING: HTTP
  429 with a `Retry-After` header, an `ai.approval.rate_limited` audit
  event (approver, class, retry_after_ms), and the same link works once
  the bucket refills (follows the prerequisite-gate precedent of
  rejecting without consuming the token).
- **Wiring** — `approval.ServerConfig.RateBudget` (new optional field;
  nil = unlimited, preserving every existing call site) is satisfied by
  `*ai.RateLimiter`; `cmd/cha-com/approval_server_cmd.go` wires a
  default-configured limiter. In-memory: each replica budgets
  independently (same posture as the limiter's documented P7 Redis
  hardening note).
- **Future** — a global per-approver cap (one approver spamming MANY
  classes can today spend `classes × 10/h`) is deliberately deferred;
  revisit alongside the P7 Redis-backed limiter.

### Added — native Anthropic Messages API client (closes the "OpenAI + Anthropic" provider claim)

The website integrations page claims "OpenAI + Anthropic" AI providers,
and `ai/client/doc.go` documented an `anthropic.go` native client — but
the file did not exist (only the OpenAI-compatible transport was real;
Anthropic worked only behind an OpenAI-shaped proxy). The native client
now exists and is wired in.

- **`ai/client/anthropic.go`** — implements the provider-agnostic
  `client.Client` interface against `POST /v1/messages`: `x-api-key`
  auth (key required — fail-fast at construction), `anthropic-version:
  2023-06-01`, required `max_tokens` (interface default 1024),
  `SystemPrompt` → top-level `system`. **JSONMode mechanism:** the
  Messages API has no `response_format` and assistant-turn `{` prefill
  returns 400 on all current Claude models, so JSONMode appends an
  explicit JSON-only instruction to the system prompt and defensively
  strips a wrapping markdown code fence from the response — downstream
  `json.Unmarshal` keeps working unchanged. **Temperature is always
  sent — including the explicit deterministic default 0** (the
  `client.Client` contract; matches the OpenAI transport, so JSONMode
  proposer calls and `llm_fixer_matcher` get the determinism they rely
  on). Models that hard-400 any sampling parameter (Opus 4.7+, Fable 5)
  are handled adaptively: a 400 `invalid_request_error` whose message
  indicates a sampling rejection triggers exactly one retry without
  sampling params, and the model is memoized (thread-safe, per-model)
  so later calls to it omit the field — and skip the extra round trip
  — up front. Non-sampling 400s stay fatal and are never retried. Usage
  maps `input_tokens`/`output_tokens` →
  `PromptTokens`/`CompletionTokens` for the audit log and rate limiter.
  Error taxonomy matches the OpenAI client: 429 → `ErrRateLimited`,
  5xx (incl. 529 overloaded) → `ErrTransport`, 401/403/4xx provider
  errors → `ErrInvalidResponse` (fatal, message preserved). Honors
  context cancellation + the Options.Timeout deadline, and caches
  identically under the existing `CachingClient` wrapper.
- **Provider selection** (`cmd/cha-com/ai_wiring.go`) — auto-detected
  by endpoint host: `--ai-endpoint` pointing at `api.anthropic.com`
  (or any `*.anthropic.com` host) builds the native client; everything
  else keeps the OpenAI-compatible client (OpenAI-shaped proxies
  fronting Anthropic are unaffected — they use the proxy hostname). No
  new flags. **The SaaS gate is unchanged and still applies**:
  Anthropic remains in the `isSaasEndpoint` blocklist, so the native
  client requires `--ai-allow-saas=true` exactly as `doc.go` promised;
  with `allowSaas=false` the endpoint is rejected before provider
  selection runs. Memoization (one client across all tiers) covers the
  new path.
- **Docs** — `ai/client/doc.go` now describes the real file set, and
  the stale "Anthropic sets a tool definition" comment on
  `Options.JSONMode` (client.go) was corrected to the system-suffix
  mechanism.
- **Tests** — httptest-based (no real API calls): request shape
  (headers, model, system, max_tokens, JSON-mode suffix), happy-path
  parse + usage mapping, multi-block content, fence-stripping yields
  parseable JSON, 429/529/500/401 classification, context cancellation,
  endpoint normalization, config validation, cache-interaction smoke,
  and the adaptive sampling-param path (temperature 0 present on the
  wire; 400-retry-success then memoized skip with exactly 3 requests
  across two calls; non-sampling 400 stays fatal with no retry;
  non-zero temperature passthrough + retry; per-model memo isolation;
  concurrent-call safety under `-race`);
  wiring tests for the SaaS gate (blocked without `--ai-allow-saas`,
  native client with it), fail-fast missing key, provider detection,
  and memoization.

### Added — cloud-aware AI: cross-resource RCA MVP (makes the Enterprise pricing claim true)

The website's Enterprise tier sells "Cloud-aware AI (cross-resource
RCA)" but no code existed — the shipped AI tiers carried K8s context
only. This is the honest MVP: a DETERMINISTIC correlation engine
(graph-join code over static edge rules — no ML) that links the
diagnostic under investigation to the cluster's active cloud-probe
findings and grounds the T0 narration + T1 proposal rationale with the
result. Correlation only grounds RCA text: **proposals stay
Kubernetes-side — no cloud mutation, no new ActionKinds, no cloud
write credentials.**

- **`ai/cloudcontext/`** — the engine. Edge rules:
  - *pvc-volume* — Pod / PVC / PV → EBS / GCP PD / Azure Disk via the
    PV's CSI or in-tree volume handle vs the cloud subject's trailing
    identifier.
  - *service-loadbalancer* — Service / Ingress → ALB target group /
    GCP LB backend / Azure AppGW pool via the LB ingress hostname/IP
    appearing as a token in the finding message (the message is split
    into tokens on whitespace/punctuation — dots, dashes and similar
    identifier characters kept — and each token compared
    case-insensitively against the hostname/IP, so an IP can't
    substring-match inside a longer IP), or — weak heuristic — the
    hostname's first DNS label equalling the LB resource name.
  - *serviceaccount-iam* — ServiceAccount workload-identity
    annotations (`eks.amazonaws.com/role-arn`,
    `iam.gke.io/gcp-service-account`,
    `azure.workload.identity/client-id`) → IAM role / GCP SA / Azure
    managed-identity findings. The Azure leg matches the annotation's
    client-id GUID against the finding's *remediation* (the OSS
    azure-mi probe surfaces the GUID only there; message and subject
    carry the identity name).
  - *certificate* — cert-manager Certificate / Ingress TLS hosts →
    ACM / GCP managed cert / Azure cert findings via domain name
    (token-exact against the subject tail or finding-message tokens —
    so `example.com` can't substring-link `shop.example.com` — with
    wildcard coverage), plus a weak name-equality heuristic: the
    cloud cert resource name vs the K8s Certificate's
    name/secretName.
  - *db-dependent-class* — **conservative by design**: hostname/env
    heuristics tying an arbitrary CrashLooping workload to a managed
    DB are too fuzzy for an MVP, so a cloud DB finding (aws-rds /
    gcp-cloudsql / azure-sql) links ONLY when the diagnostic belongs
    to a known DB-dependent class — today CNPG/Postgres diagnostics
    (subject kind `CNPGCluster`, the OSS WorkloadStateDrift analyzer).
    Pod-level diagnostics never trip this rule.
- **Effective coverage, honestly stated.** Against the OSS probe
  messages as shipped TODAY, the rules that fire are: *pvc-volume*
  (all three providers), *serviceaccount-iam* (AWS, GCP, and Azure —
  Azure via the remediation client-id match above), *certificate*
  full-domain matching for AWS + GCP (ACM subjects ARE the domain;
  the GCP probe puts the domain in its message) plus the Azure
  name-equality heuristic, and *db-dependent-class*.
  *service-loadbalancer* (all three providers) and Azure *certificate*
  full-domain matching additionally require the OSS PR #202
  (feat/cloud-probe-message-join-keys, targeted v1.26.0) message
  enrichment, which appends ` (lb: <dns-or-name>)` to the three LB
  probe messages and ` (domains: <d1>,<d2>)` to the Azure cert probe
  message — the matchers here are written forward-compatible with
  that format; on older OSS the LB rule only fires when the
  operator-visible hostname happens to appear in the message.
- **Cloud findings source** — DriftReport CRs. The OSS watcher (the
  component that actually runs cloud probes; its live cloud SDK
  clients live under the OSS module's `internal/` tree and are not
  importable here) reconciles one DriftReport per active finding with
  subject `Probe/<component>/<cloud-subject>` and deletes it on clear;
  cha-com reads exactly that active set through its existing read-only
  snapshot source (30s TTL cache, one LIST per window). Higher-level
  workload kinds (Deployment/StatefulSet) are not chased to their pods
  in the MVP — same deterministic bar.
- **Prompt integration** — a `<cloud_context>` block prepended to the
  T0 enricher and T1 fix-proposer prompts, following the
  `<target_history>` pattern exactly: conditional inclusion (absent
  when nothing links), soft-fail retrieval (a correlation failure never
  blocks enrichment/proposal), byte-budget capped (max 5 links,
  critical-first, 200-rune detail truncation). There is no separate
  cha-com Investigator prompt — T0/T1 are the complete surface.
- **On automatically, kill-switch available** — `--ai-cloud-context`
  (default **true**) on `watch` + `diagnose`. Zero-config: clusters
  without cloud findings produce zero links and byte-identical prompts;
  when no cloud findings exist the retriever performs no per-diagnostic
  K8s lookups at all. `--ai-cloud-context=false` disables wholesale.
- **Audit / observability** — `ai.enrichment.applied` and
  `ai.proposal.created` carry a `cloud_context_links` count when (and
  only when) the block fired, plus an `ai.cloud_context.applied` event
  per firing (mirroring `ai.target_history.applied`) so operators can
  prove the wiring live without pod logs.
- **Tests** — per-rule positive + negative (no-false-link) engine
  tests; linker tests over fake snapshot objects (Pod→PVC→PV chain,
  in-tree volume types, LB status, SA annotations, Certificate
  domains, CNPG suffix trimming, soft-fail); DriftReport provider
  mapping/filtering/TTL-cache tests; prompt-injection tests
  (present / absent / capped / nil-retriever); kill-switch wiring
  tests (flag default true on both commands); and the acceptance
  demo — an RDS storage-full DriftReport grounds the RCA for a
  failing CNPG cluster whose primary is crash-looping, asserting the
  `<cloud_context>` block carries the RDS finding and the audit event
  carries `cloud_context_links=1`.

### Added — `--digest-pin-third-party-policy=enrich-only` (observability for third-party images)

When a digest-pin diagnostic's image-repository is NOT in `--digest-pin-repo-map` (typically third-party / upstream images like calico, dify, langgenius/*), the DigestPinProposer previously skipped silently. Operators saw the analyzer's remediation text in Slack but had no audit trail of WHY the proposer chose not to act.

v1.22.0 adds the policy knob:

- `silent-skip` (default, legacy v1.21.0-): return nil silently, no audit event.
- `enrich-only`: emit an `ai.proposal.skipped` audit event with `reason=third_party_no_repo_map` + `image_repo=<...>` + `workload=<ns>/<name>` so operators can grep audit logs / bundles for skip decisions.

Neither mode opens a PR (there's no GitOps repo to target). The difference is purely observability. 2 new tests cover both branches. Pairs with OSS v1.25.0 which adds the workload-feeder owner_chart synthesis that unblocks the proposer-fires path for operator-managed Deployments.

### Changed — bump OSS pin v1.23.1 → v1.25.1 (P2.5)

Bumped the pinned `github.com/Bionic-AI-Solutions/cluster-health-autopilot`
dependency from the stale `v1.23.1` to the latest released tag `v1.25.1`.

The only `pkg/` source change across this range is `pkg/feeder/workload.go`:
v1.25.0 extended `detectOwner` with an OwnerReferences walker so
**operator-managed workloads** (Deployments owned by a Custom Resource, with
no Helm/ArgoCD release annotations) now synthesize `owner_chart` /
`owner_release` features. Previously `detectOwner` returned `nil` early when a
workload had no annotations.

Why it matters: CHA-com's `DigestPinProposer` (`ai/proposer/digest_pin.go`)
reads `wl.Features["owner_chart"]` to locate the chart's sub-path in the
GitOps deploy repo. Pinned to v1.23.1, operator-managed workloads got an empty
`owner_chart`, fell back to the pod/controller name, missed the expected chart
layout, and the proposer silently never opened a digest-pin PR for them. With
v1.25.1 the synthesized per-CR `owner_chart` (`<kind>-<name>`) gives the
detector a real target, so digest-pin PRs now fire for operator-managed
workloads. This also satisfies the CI "oss dependency freshness" check, which
was failing on the stale pin.

No interface drift: `pkg/ai`, `pkg/diagnose`, and the rest of `pkg/` are
byte-identical v1.23.1→v1.25.1; build, vet, and the full test suite stay green.
`pkg/ai.AuditEvent` still has no `Timestamp` field, so the P2.2 wrapper-level
timestamping remains correct and is unchanged. (True as of v1.25.1; from
OSS v1.26.0 the `entry_time` stamping lives inside OSS `pkg/audit` — see the
hash-chain swap entry above.)

### Changed — bump OSS pin v1.25.1 → v1.26.0 (release pairing)

Bumps the pinned `github.com/Bionic-AI-Solutions/cluster-health-autopilot`
dependency to `v1.26.0`, the OSS release this binary pairs with. The OSS
API change across v1.25.1→v1.26.0 is additive — notably the new
`pkg/audit` hash-chain primitive (ported from this repo; see the
hash-chain entry below) and the cloud-probe message join keys (OSS
PR #202) that complete the *service-loadbalancer* and Azure
*certificate* matchers in the cross-resource RCA MVP above. No compile
changes were required by the bump; build, vet, race tests, and lint stay
green. Verified locally that the pin matches the latest OSS tag (the
oss-dependency-freshness CI job exists but is billing-dead).

### Changed — hash-chain audit primitive now imported from OSS pkg/audit

The tamper-evident chain primitive (`ChainedSink`, resume-from-hash,
signed checkpoints, `VerifyChain` / `VerifyChainWithCheckpoints`, the
canonical-JSON format contract) was ported to the OSS module as
`pkg/audit` and is now imported from there; the duplicated private copy
(`ai/audit/hash_chain.go` + its primitive tests) is deleted. This repo
keeps ONLY the paid sinks — the chained JSONL file store
(resume-from-last-`entry_hash` + on-close anchoring), Loki, OTLP, async,
multi-sink, redaction — wired through the documented adapter path:
`NewChainedSinkResuming(inner, resumeHash, ChainOptions{Signer,
CheckpointEvery})` + `WriteCheckpoint` on close + `CheckpointSigner`
(re-exported as `ai/audit.CheckpointSigner`).

Compatibility: the OSS port review proved cross-verifiability (same
canonical bytes), re-confirmed empirically here — a chain written by the
pre-swap primitive verifies OK under the new binary, and a new-binary
append extends that same file into one continuous chain that verifies
intact. The checkpoint actor changes `cha-com/audit` → `cha/audit` on
NEW entries only; old chains still verify because the actor is hashed
DATA, not a verifier assumption. All paid-sink behavior tests were kept,
adapted to the OSS import with semantics unchanged.

### Security — T2 plan-step prerequisite ordering enforced at execution time (safety envelope)

Closed a safety-envelope gap: the T2 planner links plan steps via
`PrerequisiteActionID` and OSS `pkg/ai/types.go` documents that a step
"may only execute after the prerequisite has executed and verified" —
but nothing enforced this at execution time. An approver could click
step 3's signed URL before step 1 ever ran. Now the approval-server
refuses out-of-order steps.

- **Token plumbing** — `SignerImpl.Sign` embeds a step's
  `PrerequisiteActionID` as a signed (tamper-evident) custom
  `prerequisite_action_id` JWT claim. `pkg/ai.VerifyToken` signs over and
  tolerates unknown claims, so the OSS verify path is unchanged;
  prereq-free proposals keep the exact historical token shape. The
  verifier extracts the claim after signature verification.
- **Enforcement choke point** — `Server.handleApprove`
  (`ai/approval/server.go`): a step with a prerequisite executes only if
  the prerequisite is in the executed-step set. Otherwise the click is
  rejected `409 Conflict` with "prerequisite step `<id>` has not executed
  yet" plus an `ai.approval.prerequisite_blocked` audit event, and the
  executor is never invoked.
- **JTI semantics: a blocked click consumes NOTHING.**
  `VerifierImpl.VerifyAction` is split into stateless `peek` (signature +
  expiry) and `burn` (consume JTI); the prerequisite gate runs between
  them. A too-early click leaves the one-time link valid, so the operator
  executes the earlier steps and retries the SAME link in order. Replay
  protection after a successful execution is unchanged. The executed-set
  check is **fail-closed but retryable**: if the shared store can't be
  read, the click gets `503` and the JTI survives.
- **Executed-step store (`ai/approval/prerequisite.go`)** — "executed
  successfully" = `Execute` returned no error, or `ErrFindingCleared`
  (goal already achieved — counted so the rest of the plan doesn't
  deadlock on a self-healed finding). A step that executed WITH an error
  keeps its dependents blocked. HA-safe: with
  `--store-backend=configmap`, `ConfigMapExecutedStore` shares the
  **existing replay ConfigMap** under a separate `executed_actions` data
  key (same CAS/prune machinery), so both replicas see one executed-set
  and the chart's name-scoped RBAC needs **no new resourceNames**. The
  `inmemory` backend pairs with a process-local executed store as before.
  Records are retained until step-token expiry + 1 h grace, then pruned.
- Tests: out-of-order rejected (JTI not burned, retry-in-order succeeds,
  replay still enforced afterwards), in-order succeeds, failed
  prerequisite blocks dependent, finding-cleared prerequisite unblocks
  dependent, T1 / prereq-free tokens unaffected, store-error fails closed
  without burning, in-memory + ConfigMap store round-trips
  (shared-ConfigMap coexistence with the replay key, lazy create, expiry).

### Security — auto-merge gate now VERIFIES the Ed25519 attestation before merging (safety envelope)

Closed a safety-envelope gap: the website promises the digest-pin
auto-merge gate requires "Ed25519 attestation **verified**", but the
Phase 3.B gate (`cmd/cha-com/auto_merge_gate.go`) only checked that a
signer was CONFIGURED — nothing re-verified the signature before the
merge. A PR body tampered with (or replaced wholesale by a stolen-PAT
attacker) between `CreatePullRequest` and the merge would still
auto-merge. Now the merge is gated on actual cryptographic
verification, fail-closed at every step.

- **Verification choke point** —
  `DigestPinProposer.verifyMergeAttestation` (`ai/proposer/digest_pin.go`)
  runs AFTER a positive gate verdict and BEFORE
  `Forge.MergePullRequest`. It re-fetches the PR body **from the forge**
  (what GitHub serves now, not the local copy we sent), extracts the
  `cha-cosign-attestation:v1` block, verifies the Ed25519 signature over
  the canonical payload, and **binds the payload fields to the exact
  change being merged**: `action_id`, `repo` (owner/name of the target),
  `ref`, `file_path`, `before_digest`, `after_digest`. Field binding
  matters — a valid signature only proves our key signed *something*; a
  validly-signed attestation replayed from a different CHA PR is
  rejected on mismatch.
- **Fail closed.** Missing attestation block, malformed block, body
  fetch error, signature mismatch, field mismatch, no signer, or a PR
  opened while signing soft-failed → the merge is skipped, the PR stays
  open for click-to-fix, the action's rationale records
  `auto-merge skipped: attestation verification failed (…)`, and an
  `ai.automerge.skipped` audit event (reason
  `attestation_verify_failed`, repo, pr_number, error) is emitted via
  the proposer's audit channel. No `cha_*` metric fits (the
  `cha_autonomy_decision_total` family is the autonomy engine's closed
  enum, not the PR path); the audit event is the per-fire record.
- **Public key derivation** — no new flag. The verification key is the
  public half of the existing `--digest-pin-attestation-key` private
  key: `AttestationSigner.PublicKey()` (new interface method) derives it
  via `ed25519.PrivateKey.Public()`.
- **Forge surface** — new `Forge.GetPullRequestBody(ctx, owner, repo,
  number)` (`ai/forge/forge.go`), implemented by `GitHubForge` as
  `GET /repos/{owner}/{repo}/pulls/{number}` (deliberately uncached).
- **`ExtractAttestationBlock`** (`ai/proposer/attestation.go`) — the
  read-side counterpart to `RenderAttestationBlock`; distinguishes
  "no block" (`ErrAttestationMissing`) from "malformed block" so skip
  reasons are precise. Block markers are now shared constants.
- The gate's other four conditions (breaker closed, matching
  approve-class policy, Wilson class success-rate ≥ threshold, signer
  configured) are unchanged; the startup log line now reads
  `attestation=signed+verified-on-merge`.
- Tests: valid attestation merges (and the commit message + rationale
  record "attestation verified"); tampered payload rejected; tampered
  signature rejected; missing/stripped attestation block rejected;
  validly-signed attestation for a DIFFERENT digest/PR rejected
  (replay); body-fetch error rejected; no-signer fails closed with the
  audit event asserted; extract round-trip + malformed-block cases;
  GitHubForge wire-format test; all Phase 3.B gate-condition regression
  tests unchanged and passing.
- **Scope caveat** — verification binds the PR *body*, not the branch
  head SHA; commits pushed to the PR branch after creation are not
  covered. Branch protection remains the guard for that.

### Security — class-action links are now actually one-shot (closes the multi-use class-link gap found in review)

Closed a pre-existing safety gap a reviewer found: class JWTs
(`ai/approval/class_token.go`) document their `JTI` claim as "one-shot
replay defense", but `handleClassCommon` never consulted a replay store
— approve-class/deny-class/silence-class links were effectively
MULTI-USE (every re-click rewrote the policy, and a replayed
/approve-class re-executed the action). Worse, the JTI claim was never
even stamped at mint time. The /approve path has burned JTIs in the
replay store since v1.0.0; the class paths now match.

- **Burn in the SAME replay store /approve uses** (in-memory or the
  shared-ConfigMap store for HA), under a `class:` namespace prefix
  applied at burn time. The prefix is load-bearing: action tokens burn
  the raw ActionID as their JTI and the class token's ActionID mirrors
  that same proposal, so an un-namespaced burn would let a class click
  consume the per-subject /approve link (and vice versa).
- **JTI stamped at mint.** `SignClassAction` now stamps `JTI = ActionID`
  (the proposal-signer convention) when the caller left it empty. The
  three class links minted for one proposal SHARE one JTI — approve /
  deny / silence are mutually exclusive one-shot decisions on the same
  policy key, exactly like the /approve+/deny pair sharing a JTI.
  Legacy in-flight tokens (minted without a JTI, ≤15-min lifetime) fall
  back to the ActionID at burn time, so they stay clickable AND become
  one-shot through a rolling upgrade.
- **Gate ordering follows the handleApprove precedent:** stateless
  verification → scope check → rate budget → JTI burn → policy write →
  execute. A rate-limited (429) click burns nothing; for deny/silence
  (no execute) the burn still precedes the policy `Put`, so a replay
  mutates NOTHING.
- **Replay → 409** with a clear "already has a recorded decision"
  message + a new `ai.approval.class_replay` audit event. **Replay-store
  failure → 503 fail-closed WITHOUT burning** (no policy write, no
  execute, link stays retryable) — same contract as the prerequisite
  gate's 503.
- **No legitimate-reuse flow broken:** there is no confirmation-page
  GET-then-POST flow anywhere — Slack class links open as plain GETs
  and the GET IS the decision, identical to /approve. Both GET and POST
  burn.
- Tests: replay → 409 + no policy write + no execute + audit event;
  deny/silence burn too; trio mutual exclusion; class-vs-action JTI
  non-collision in a shared store; 429 does not burn; store error fails
  closed without burning; legacy no-JTI token fallback; reverse-direction
  non-collision (action JTI burned first, class link still works).
- **Re-decision path:** to change a decision, act on the next proposal
  cycle's fresh links; class policy entries expire after 7 days. A
  transient policy-Put failure AFTER a successful JTI burn leaves the
  link spent (same accepted trade-off as handleApprove's
  execute-after-burn).

## [1.21.0] — 2026-06-10

### Added — Observability log lines for Phase 3.B + 3.C

- `digest-pin: auto-merge gate armed (min_success_rate=0.95, attestation=on, policies=on, breaker=shared)` logs once at startup when the Phase 3.B auto-merge gate is constructed. Operators can `kubectl logs deploy/bionic-aiwatch | grep auto-merge` to prove the gate is armed without reading source. Per-fire decisions still flow through the proposer's Rationale + the audit event chain (no per-call log noise).
- `ai.target_history.applied` audit event fires when the Phase 3.C `<target_history>` block prepends to an enricher prompt (silent in the first-encounter case). Closes the "wired but no observability" gap surfaced in the v1.20.1 adversarial review.

### Note — `--ai-audit-log` should NOT be `-` in production

The CHA-com binary supports `--ai-audit-log=-` (stdout) for development. In production, set it to a persistent file path (e.g. `--ai-audit-log=/var/log/cha-com/audit.jsonl`) so `cha-com audit-bundle` has audit events to bundle. The audit-bundle subcommand otherwise correctly reports a zero-byte audit.jsonl with the manifest note "audit-log flag empty".

## [1.20.1] — 2026-06-10

### Fixed — CRITICAL: aiwatch panic at startup on v1.20.0

v1.20.0 added `--cluster-name` to the audit-bundle subcommand AND
called `ck.register` (which already registers `--cluster-name`).
Pflag panicked at startup with `flag redefined: cluster-name`,
crashing every aiwatch / approval-server pod into CrashLoopBackOff
on every cluster that rolled to v1.20.0.

This hotfix removes the subcommand-local `--cluster-name` flag;
the bundle now reads cluster identity from `ck.clusterID` (set by
the shared `--cluster-name` registered by ck.register).

2 new regression tests assert `auditBundleCmd()` constructs
without panic and that the expected flags are registered exactly
once. Verified locally: `go run ./cmd/cha-com --help` succeeds;
`go run ./cmd/cha-com audit-bundle --help` shows all expected flags.

Rollout-safe: v1.20.0 was rolled back to v1.19.0 on the affected
cluster before this hotfix tagged.

## [1.20.0] — 2026-06-10

Adversarial-review fixes after v1.19.0.

### Fixed — `audit-bundle --since 30d` now parses

v1.18.0 shipped the subcommand with `DurationVar` for `--since`, but
Go's `time.ParseDuration` rejects "d" because of calendar-day vs
civil-day ambiguity. The doc example showed `--since 30d` which
broke at runtime: `invalid argument "30d" for "--since" flag: time: unknown unit "d" in duration "30d"`.

This release accepts `<N>d` shorthand (mapped to N*24h) alongside
standard Go duration syntax. Empty `--since` defaults to 30d. Four
new tests cover day-suffix, hour-suffix, empty-default, and
invalid-day-count.

### Fixed — `audit-bundle --rag-store-url` now registered

v1.18.0 also called out `--rag-store-url` in the help text but the
flag was never registered (it lives on `clusterKnowledgeFlags`, not
`aiFlags`). Running the bundle against a live RAG store returned
`Error: unknown flag: --rag-store-url`.

This release registers the cluster-knowledge family on the
subcommand. The flag's value plumbs into `aiFlags.memStoreURL` when
the operator hasn't set `--memory-store-url` directly. `--cluster-name`
falls back to `clusterKnowledgeFlags.clusterID` when not set
directly on the subcommand.

### Fixed — goreleaser disk-OOM root cause

Releases v1.16.0 through v1.19.0 all failed at goreleaser's docker-
build phase with `no space left on device` on the GitHub runner
(~14 GiB free → multi-arch builds need ~25 GiB). Each was salvaged
via local single-arch build + push, which broke arm64 operators.

This release adds a pre-checkout disk-cleanup step that frees ~25
GiB by removing pre-installed Android SDK / .NET / Haskell / Swift
/ CodeQL toolchains that the workflow doesn't need. Multi-arch
builds should now complete without local fallback. Verified locally:
the same workflow runs in ~75 min with ~40 GiB free at the docker-
build step.

## [1.19.0] — 2026-06-09

### Fixed — Phase 3.B production wiring of `digestPinAutoMergeGate`

The v1.17.0 release shipped the `AutoMergeGate` interface + Forge
surface + 11 gate-behavior tests but never CONSTRUCTED
`digestPinAutoMergeGate` at runtime. The flag `--digest-pin-auto-merge=true`
was a silent no-op because the gate stayed nil.

This release closes the loop:

- `aiFlags.sharedBreaker()` exposes the SAME `CircuitBreaker` to
  both the autonomy engine and the auto-merge gate, so an open
  breaker from a bad auto-apply stops auto-merge too (otherwise
  auto-merge would amplify a regression).
- `ai.ClassSuccessConfidence` exported. Same Wilson-lower-bound
  semantics as Phase 2.C; gate uses it via the new
  `memoryWilsonClassHistory` adapter.
- `aiFlags.buildPolicyLooker(ragStore)` shares the autonomy engine's
  `policyAdapter` with the gate.
- `--digest-pin-min-success-rate` flag (default 0.95) surfaces the
  threshold as an operator-facing knob.
- `digestPinFlags.resolveAutoMergeGate(ai, ragStore, hasAttestation)`
  constructs the gate when all deps are present; errors with
  actionable wording listing exactly which missing dep blocks the
  half-config (no `--ai-tier` / no `--digest-pin-attestation-key`
  / no `--rag-store-url`).
- `watch_cmd` calls `resolveAutoMergeGate` BEFORE
  `buildDigestPinProposer` so the proposer picks up the gate.

4 wiring tests added (disabled-by-default, nil-ai-hard-fails,
no-attestation-hard-fails, no-memory-hard-fails). The 11 gate
tests from v1.17.0 still cover `ShouldAutoMerge` end-to-end.

### Pairs with OSS

`v1.23.0+` (trigger-expansion M1-M7 bundle). No new CHA-com / OSS
interaction surfaces — this is the production wiring for an
existing CHA-com feature.

## [1.18.0] — 2026-06-09

Phase 3.C + 3.F bundled.

### Added — Investigator-level RAG grounding (Phase 3.C)

`TargetHistoryRetriever` interface + `EnricherConfig.TargetHistory`
field. When wired, the enricher prepends a `<target_history>` block
to the LLM prompt summarizing recent outcomes on the SAME target:

  "This exact target has been touched 14 time(s) in the recent window:
   11 cleared, 2 still-present, 1 reverted. The most recent attempt
   (4h ago) cleared with action_kind=ApplyManifest."

Plus up to 8 detail lines, each citing verdict + recorded_at +
action + rationale. The framing emphasizes history is OBSERVATIONAL
not INSTRUCTIONAL — the runtime re-validates every fix against live
state before acting.

Reuses Phase 2.A's existing outcome memory (`Memory.RecentOutcomesByTarget`)
via a new `RecentByTarget` adapter. nil retriever = no block in prompt
(legacy single-cluster behavior). For repeat findings on the same
resource, expected to cut investigator wall-clock + token cost by
~90% while sharpening the conclusion.

### Added — `cha-com audit-bundle` subcommand (Phase 3.F)

SOC2-friendly evidence pack exporter. Reads the audit JSONL written
by `--ai-audit-log` + the RAG outcome memory, produces a tar.gz:

  - `manifest.json` — tool version, generation timestamp, cluster
    name, since-window, audit event count, outcome count, SHA256 of
    every contained file
  - `audit.jsonl` — verbatim copy of the source audit log
  - `outcomes.jsonl` — every `memory.Resolution` within `since`,
    one JSON object per line

Soft-fails on missing audit log (records a manifest note + ships a
zero-byte audit.jsonl); hard-fails only on unwritable output path
or unreachable RAG store. Bundle is local-only — no network egress.

Reuses the existing `aiFlags` registry for memory wiring so the
same `--rag-store-url` + `--ai-llm-*` flags as the watcher.

New `memory.Memory.RecentAll(ctx, since)` exposes the unfiltered
outcome timeline (counterpart to `RecentOutcomesByTarget/Class`).

### Tests

- 8 new tests in ai/ covering TargetHistoryRetriever soft-fail paths
  + aggregate counts + cap behavior + RecordedAt rendering +
  enricher-side wiring (block lands in user message; nil retriever
  = legacy behavior)
- 10 new tests in cmd/cha-com/ covering happy-path bundle layout,
  manifest checksums, missing/empty audit log soft-fail, memory error
  hard-fail, line-counting edges, SHA256 vector, gzip-magic-bytes
  smoke

### Pairs with OSS

`v1.22.x+`. No chart or operator changes — 3.C is binary-side prompt
plumbing; 3.F is a new subcommand that runs as a Job/CronJob/ad-hoc
exec on a pod with `--ai-audit-log` + `--rag-store-url` access.

