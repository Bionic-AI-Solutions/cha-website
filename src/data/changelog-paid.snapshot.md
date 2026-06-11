<!-- DO NOT EDIT — vendored snapshot of CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- source: CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- synced: 2026-06-11 -->
<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->

# Changelog — CHA Enterprise (private)

This file mirrors the OSS CHA `CHANGELOG.md` for the proprietary
CHA-com binary. The CHA-com binary imports the OSS module and adds
patterns + LLM/approval infrastructure on top; every CHA-com release is
pinned to a specific OSS release.

> **PROPRIETARY AND CONFIDENTIAL.** This file is part of the CHA-com
> codebase. Not for redistribution.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/), aligned with the OSS release
the binary depends on.

---

## [Unreleased]

## [1.22.0] — 2026-06-11

### Added — `--digest-pin-third-party-policy=enrich-only` (observability for third-party images)

When a digest-pin diagnostic's image-repository is NOT in `--digest-pin-repo-map` (typically third-party / upstream images like calico, dify, langgenius/*), the DigestPinProposer previously skipped silently. Operators saw the analyzer's remediation text in Slack but had no audit trail of WHY the proposer chose not to act.

v1.22.0 adds the policy knob:

- `silent-skip` (default, legacy v1.21.0-): return nil silently, no audit event.
- `enrich-only`: emit an `ai.proposal.skipped` audit event with `reason=third_party_no_repo_map` + `image_repo=<...>` + `workload=<ns>/<name>` so operators can grep audit logs / bundles for skip decisions.

Neither mode opens a PR (there's no GitOps repo to target). The difference is purely observability. 2 new tests cover both branches. Pairs with OSS v1.25.0 which adds the workload-feeder owner_chart synthesis that unblocks the proposer-fires path for operator-managed Deployments.

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

## [1.17.0] — 2026-06-09

Phase 3.B — auto-merge DigestPin PRs at very-high confidence.

### Added — Forge.MergePullRequest + GitHubForge implementation

`ai/forge.Forge` interface gains `MergePullRequest(ctx, owner, repo,
number, commitMessage)`. The GitHubForge implementation PUTs the
GitHub merge endpoint with `merge_method=squash`. Errors:
- `ErrMergeBlocked` (HTTP 405) — branch protection / required
  reviews / pending status checks
- `ErrMergeConflict` (HTTP 409) — head/base diverged

### Added — `AutoMergeGate` interface + concrete `digestPinAutoMergeGate`

The proposer-side `AutoMergeGate` interface (1 method:
`ShouldAutoMerge`) keeps `DigestPinProposer` policy-agnostic.
`cmd/cha-com/auto_merge_gate.go` is the concrete gate that ANDs
all five guard conditions:

1. AutoMerge feature flag on (`--digest-pin-auto-merge=true`,
   off by default)
2. Attestation signer configured (Phase 2.H) — refuses to
   auto-merge unsigned PRs
3. Circuit breaker closed (open = recent outcomes bad)
4. ≥1 matching approve-class policy (the SRE explicitly trusted
   this class via Phase 2.B "approve+remember")
5. Wilson lower-bound class success-rate ≥ minSuccessRate
   (default 0.95 — very-high confidence)

Any miss → PR stays open for human review (legacy Phase 2 flow).
Soft-fail on `MergePullRequest` errors: PR stays open + the action
Rationale records "auto-merge attempted but blocked by branch
protection" / etc, for audit + Slack visibility.

### Added — `--digest-pin-auto-merge` CLI flag

Operator-facing switch. The gate's threshold (`minSuccessRate=0.95`)
is currently a constant inside the gate construction; a follow-up
will surface it as `--digest-pin-min-success-rate`.

### Deferred to follow-up

Full `main.go` wiring (constructing `digestPinAutoMergeGate` with
concrete `breaker` + `policies` + `classHistory` deps + CLI flag
plumbing for the threshold) lands in a follow-up PR — this release
delivers the interface + Forge surface + test coverage so the gate
can be wired per-cluster without core re-touches.

### Tests

11 new tests: 4 propose-side (`ai/proposer`) + 7 gate (`cmd/cha-com`).
Covers all 5 gate paths, soft-fail merge errors, nil-gate legacy
behavior, nil-deps safety.

### Pairs with OSS

`v1.22.0+` (no chart change needed — the Forge surface ships in the
binary; gate enabled per-cluster via `--digest-pin-auto-merge`).

## [1.16.0] — 2026-06-08

Phase 2 paid-tier closure. Pairs with OSS `v1.21.1`.

23 commits across 8 sub-deliverables (PR #45). All locally tested
and live-verified on the dev cluster as `cha-com:1.16.0-dev1` before
canonical tagging.

### Added — "Approve+remember class" workflow end-to-end (Phase 2.B)

- `ai/policy.PolicyEntry` + `ai/policy.Store` (RAG-backed,
  in-Qdrant under `Kind="auto_apply_policy"`)
- `autonomyEngine.policies policyLooker` consults active policies
  BEFORE the static MinConfidence gate; a matching approve-policy
  yields `AutoApply=true` without similarity-prior requirement
- `/approve-class`, `/deny-class`, `/silence-class` HTTP routes
  on the approval-server, each scoped to its own JWT
  (`Scope ∈ {approve-class, deny-class, silence-class}`) so a
  click on one URL can't be replayed against another
- New `ClassTokenClaims` JWT type carries Source + ActionKind +
  MessagePattern (locally defined in cha-com to avoid bumping OSS
  `pkg/ai.TokenClaims` for paid-tier-only fields)
- 4-button Slack render row: ✅ Approve · 🚫 Deny ·
  🧠 Approve+remember class · ❌ Deny+remember class ·
  🔕 Silence class (7d)
- Per-cycle observability log: `policies: cycle=N active=A muted=M`
- `policyAdapter` calls `policy.PolicyEntry.Matches(d, kind, now)` so
  MessagePattern matching fires on per-message granularity (NOT
  just MessagePattern="" wildcards as in v1.16.0-dev1's first cut)

### Added — Wilson-bound class-success-rate confidence (Phase 2.C)

`classSuccessConfidence` computes a 95% Wilson lower bound on the
cleared / (cleared + still-present + reverted) rate. `DecideAutonomyWithInputs`
merges it with the existing similarity-based confidence via `max()`.
Class history rescues high-volume well-tested classes (50/50 ≈ 0.93
confidence) while small samples don't over-claim (1/1 ≈ 0.21,
10/10 ≈ 0.72).

### Added — LLM-driven proposer for unmatched diagnostics (Phase 2.D)

`LLMProposer` fills the click-to-fix gap for findings outside the
keyword fixer set. Closed-enum gate enforces ActionKind ∈ pkg/ai's
fixed set (defense-in-depth before pkg/ai's Validate). Memory-grounded
prompts include per-(source, action_kind) success stats from the
Phase 2.A.1 RAG outcome memory. Per-cycle observability:
`llm-proposer: cycle=N attempted=A succeeded=S refused=R invalid=I errored=E rejected=J`.

### Added — Lease-based leader election (Phase 2.F)

`LeaderElector` interface + `leaseLeaderElector` impl wrapping
`client-go/tools/leaderelection` + `coordination.k8s.io/v1.Lease`.
`--leader-election*` CLI flags. nil-safe `noopLeaderElector` for
single-replica (default) — byte-identical to pre-2.F. Audit events
on lease lifecycle.

### Added — Prometheus instrumentation + /metrics endpoint (Phase 2.G)

8 metric families — `cha_cycle_total`, `cha_diagnostic_total`,
`cha_outcome_total`, `cha_outcome_revert_total`, `cha_policy_active`,
`cha_llm_proposer_total`, `cha_autonomy_decision_total`,
`cha_breaker_open` — exposed at `/metrics` via the
`--metrics-addr` flag. Label sets are closed enums for bounded
cardinality.

### Added — Cosign-style attestation on DigestPin PR bodies (Phase 2.H)

Ed25519 signature over a canonical payload (action_id, repo, ref,
file_path, before_digest, after_digest, observed_at). Embedded
public-key PEM in the PR body. Reviewers verify with `openssl` (or
a future cosign upgrade — same key + payload format). Soft-fail on
key-read errors. `--digest-pin-attestation-key` +
`--digest-pin-attestation-kid` flags. Chart wires a Secret mount at
`/etc/cha/attestation/` (OSS v1.21.1+).

### Changed — Pin OSS dependency to v1.21.0

`go get github.com/Bionic-AI-Solutions/cluster-health-autopilot@v1.21.0`.
Carries the chart-side Phase 2 changes (HA, metrics, class buttons,
Silence MessagePattern, DisruptionDrift analyzer).

### Fixed — Race-safe leader-election test fixtures

CI runs with `-race` and caught concurrent access on the raw
`bytes.Buffer` in two leader-election tests. Wrapped in a
sync.Mutex-protected `syncBuf` helper.

### Fixed — `MY_POD_NAME` env var fallback in lease elector ctor

`buildLeaderElector` now reads `MY_POD_NAME` (the chart's
downward-API name) with `POD_NAME` as fallback.

### [1.15.1-dev1] — 2026-06-08 (LOCAL DEV; canonical v1.16.0 deferred to credit return)

This is the **Phase 2.B "Approve+remember class" rollout**. Single
local-only release (no `git push`, no goreleaser) due to a temporary
GH Actions credit constraint; promoted to canonical `v1.16.0`
in one batch push when credits return.

### Added — `policy.PolicyEntry` + `policy.Store` (Phase 2.B.1 + 2.B.2)

`PolicyEntry{Source, ActionKind, MessagePattern, ExpiresAt, Decision,
ClickedBy, ClickedAt}` defines a class-level approve/deny/silence
memory. `InferMessagePattern` projects the clicked diagnostic's
message to a stable class-substring at click time (recognized
templates: SecurityDrift digest-pin, CapacityDrift HPA-pinned,
ConfigDrift rollout-stuck, DNSChainDrift missing-ingress; fallback
to first 6 words).

`policy.Store` backs onto rag.Reader+Writer with local
`Kind="auto_apply_policy"`. Nil-safe so memory-unconfigured deploys
degrade cleanly.

### Added — Autonomy class-policy bypass (Phase 2.B.3)

`autonomyEngine.policies policyLooker` consults active class policies
BEFORE the static MinConfidence gate. A matching approve-policy →
AutoApply=true with no prior-evidence requirement. The operator's
prior click IS the trust signal. Circuit breaker still gates.

### Added — `/approve-class`, `/deny-class`, `/silence-class` routes (Phase 2.B.4)

New `ClassTokenClaims` JWT carries `Scope` + Source + ActionKind +
MessagePattern. Three handlers share `handleClassCommon`: OIDC,
token verify, scope check, PolicyWriter.Put with 7-day default
lifetime, audit write, optional execute (only /approve-class).
Scope mismatch → 403.

### Added — 4-button row in Slack render + class-URL minting (Phase 2.B.5)

`SignerImpl.SignClassAction(claims)` + `approvalURLMinter.classActionURLs`
mint 3 URLs with distinct Scope claims. Render emits 5 lines:

```
✅ Approve / 🚫 Deny / 🧠 Approve+remember class /
❌ Deny+remember class / 🔕 Silence class (7d)
```

Class buttons hidden when URL empty (legacy memory-off byte-identical).

### Added — JWT scope check (Phase 2.B.7) — folded into 2.B.4

Defense-in-depth for URL substitution attacks.

### Added — Per-cycle policy observability log (Phase 2.B.8)

`policies: cycle=N active=A muted=M` sibling to the Phase 2.A.4
`outcomes:` line.

### Added — Field-travels integration test (Phase 2.B.10)

Methodology refinement from Phase 1's DriftReport bug:
`TestIntegration_ClassPolicy_ClickRoundTripsToStore` proves click
→ JWT mint → /approve-class → policy.Store.Active path with every
field intact.

### Added — Approval-server wires ClassVerifier + PolicyWriter (Phase 2.B.11)

`approvalServerCmd` registers `--rag-*` flags. Both nil = class
endpoints return 503 cleanly (legacy unchanged).

### Deferred — OSS Slack render parity (2.B.6) + class-scoped Silence CR (2.B.9)

Both require OSS edits + `replace` directive plumbing to test locally
under the GH-Actions-credit constraint. Will land alongside the
canonical `v1.16.0` push when credits return; OSS `v1.21.0` pair.

### Pairs with OSS

OSS `v1.20.1` (unchanged from `v1.15.0`).

---

## [1.14.0] — 2026-06-07

### Added — `TestAISlackFlags_RegisterBindsFlags` (PR #41)

Post-Phase-1 adversarial audit caught a test the original 1.A plan called for (Task 1.A.11) that was never written. The test invokes `aiSlackFlags.register(...)` with a captured slice and asserts the `--ai-slack-url-env` flag is registered. Without it, a rename or arity drift on the register closure (which has happened before to `digestPinFlags`) would only surface on a live deploy. Mirrors `TestRegister_DigestPinFlagsRegistered`.

### Changed — Pin OSS dependency to v1.20.0

Bumps `github.com/Bionic-AI-Solutions/cluster-health-autopilot` v1.18.2 → v1.20.0. The paid binary now carries:

  - Phase 1.B placeholder substitution (PVC StorageClass, Deployment selector) — OSS v1.19.0
  - Phase 1.E per-cycle delta render (🆕 New this cycle + stable-collapse + opt-in no-change digest) — OSS v1.19.0
  - Phase 1.D operator TicketingSpec wiring (`spec.ticketing.*` → `--ticketing-*` flags) — OSS v1.20.0

Pairs with OSS v1.20.0+ (or v1.20.1+ for the full Phase-1.B audit-fix set).

## [1.13.0] — 2026-06-05

### Added — Forge GitHub-API hardening: rate-limiter + secondary-rate-limit + 429 (PR #39)

The DigestPinProposer's per-cycle fan-out reaches GitHub's 5000 req/h authenticated limit on busy clusters with many digest-pin candidates. The 1.11.4 read cache cut volume ~14× but bursty cycles still risked the secondary-rate-limit kill (HTTP 403 + opaque body). Once limited, the forge surfaced the 403 as "token scope?" — operators saw nonsense and the proposer effectively died for the rest of the cycle.

Three layers in `ai/forge`:

- **`RateLimiter`** (`golang.org/x/time/rate`). Default: 5000/h, burst 50. Cache hits short-circuit before the HTTP layer so they don't consume tokens; only real GitHub calls do. `nil = unlimited` (legacy behaviour preserved).
- **Secondary-rate-limit retry**. On HTTP 403 + body containing `"secondary rate limit"`, sleep `SecondaryRetryDelay` (default 60s) and retry exactly once. Two-strikes surfaces a real error.
- **429 Retry-After**. Honor the header (delta-seconds form, GitHub's only output), capped at `Max429Wait` (default 5s) so a misbehaving upstream can't pin a worker for an hour.

All retries are context-aware — a cancelled cycle aborts cleanly instead of pinning the worker.

### Added — DigestPinProposer per-cycle workload-key dedup (PR #39)

SecurityDrift emits one digest-pin diagnostic per Pod that lacks a digest pin. A Deployment with N replicas = N findings in one cycle, all mapping to the same `(ns, controller-name)` workload. Without dedup, the proposer did N rounds of (RAG + Detect + CreateBranch + UpdateFile + CreatePullRequest) when 1 was enough — and the redundant CreatePullRequest calls were the most expensive write-path step against GitHub's secondary rate limit.

- Dedup map keyed on `workloadKey = "<ns>/<controller-name>"`.
- `alreadyProposed()` check at the TOP of `Propose()` (early-skip saves the RAG round-trip on repeats).
- `markProposed()` only AFTER `CreatePullRequest` succeeds — transient misses (RAG warmup, file not in repo) don't suppress retries on subsequent replicas in the same cycle.
- `ResetCycle()` exposed for the caller. Wired into `watch_cmd.tick()` as the first thing each cycle. nil-receiver safe.

Pairs with OSS v1.19.0.

## [1.12.0] — 2026-06-05

### Added — cha-com → Slack bridge: `🤖 AI Tier Activity` digest

Closes the architectural gap where cha-com aiwatch's proposal output
(auto-applied PRs, awaiting-approval items, AI-declined items) lived
entirely in process memory + stdout and never reached the operator's
Slack channel. The OSS bionic-watcher's Slack post only knows about
OSS-side proposers (NetworkPolicy ManifestBridge) — paid-tier users
got auto-PRs they couldn't see and Approve URLs they had no way to
click.

After each watch cycle's `proposeFixes` + `autonomy.Consider`, the
new renderer produces a `🤖 AI Tier Activity` SlackPayload digest
with three sections (each skipped when empty):

- **🔧 Auto-applied (N)** — autonomy fired + action executed. Lists
  subject + PR URL (for `ProposePullRequest`) so operators can
  review/merge.
- **⏳ Awaiting your approval (N)** — autonomy ran but the action
  needs human approval. Includes findings where (a) autonomy is
  disabled entirely OR (b) the ActionKind isn't in
  `--autonomy-allow`. Both cases have valid signed Approve/Deny URLs
  the operator can click directly from Slack.
- **🚫 AI declined (N)** — autonomy hit a real safety block
  (circuit breaker open, protected namespace, low confidence,
  missing rollback). Lists subject + reason; no Approve/Deny links
  because the AI deemed it unsafe.

Chunked into ≤35K-char SlackPayloads to stay under Slack's silent
40K-attachment-text truncation (same defense as OSS
`SplitCriticalPayloads`).

New flag: `--ai-slack-url-env=<ENV_VAR>` (default empty = feature
OFF). When set, the named env var must hold a Slack incoming-webhook
URL. Typical wiring: `--ai-slack-url-env=SLACK_CRITICAL_URL` reuses
the OSS watcher's critical-channel webhook so all AI tier activity
lands in one place.

Per-cycle observability:
- `ai-slack: cycle=N render produced M payloads from K proposalRecords`
- `ai-slack: posted M chunks to webhook` (success path)
- `ai-slack: post failed: ...` (error path)

New files: `cmd/cha-com/ai_slack_digest.go` (renderer + chunker),
`cmd/cha-com/ai_slack_digest_test.go` (6 unit tests),
`cmd/cha-com/ai_slack_wiring.go` (flag + poster),
`cmd/cha-com/ai_slack_wiring_test.go` (4 unit tests).
Wired into `cmd/cha-com/watch_cmd.go::tick()` after autonomy.Consider.

10 unit tests; verified live 2026-06-05 on dev3: 50 NetworkPolicy
missing-network-policy items posted as 3 chunks to ceph-critical
with Approve/Deny URLs operators can click directly.

## [1.11.4] — 2026-06-05

### Fixed — Paginated Qdrant scroll (PR #34)

- `ai/memory/rag_qdrant.go::scroll` previously hard-coded `limit: 100` with no `next_page_offset` loop. `RAG.Get` walks the result set linearly for an exact key match, so any entry whose Qdrant point ID sorted past position 100 was silently invisible.
- Diagnosed live 2026-06-04: DigestPinProposer silently skipped workloads (livekit-server, media-services/scenes-worker, voice-studio-backend, ...) whose alphabetical position landed after page 1. RAG had valid entries with image digests + RepoMap matched, but `RAG.Get` couldn't see them.
- Fix paginates with `next_page_offset` (pageSize=1000); caller's `Limit` parameter respected as a global cap.
- New regression test `TestQdrantRAG_ScrollPaginatesPastFirstPage`: fake Qdrant with 50-per-page; upsert 200 entries; verify `List()` returns all 200 and `Get()` reaches the last entry.

### Added — Per-forge read cache (PR #36)

- `GitHubForge` now has `ReadCacheTTL` (default 5m via `NewGitHubForge`; 0 disables). `GetFileContent` + `ListRepoFiles` check cache first; memoise body + error.
- Diagnosed 2026-06-04: with the OSS Detect fallthrough (v1.18.3), every digest-pin candidate's `releasesrc.Detect` walked ~600 yaml files per candidate. With ~14 candidates × ~630 files = ~9000 API calls/cycle = GitHub secondary rate-limit territory. 2-min-per-finding processing observed.
- Cache collapses repeats: 14 candidates against same repo = ~630 calls instead of ~9000. ~14× reduction.
- `UpdateFile` calls `InvalidateRepoReadCache(owner, repo)` on success so reads after a write see the new SHA (fixes 409 sha-mismatch loop for multi-replica workloads).
- New tests: `TestGitHubForge_ReadCacheCollapsesRepeatedReads` + `TestGitHubForge_ReadCacheTTLZeroDisablesCaching`.

### Fixed — DigestPinProposer branch-name colon-in-ref (v1.11.3)

- **Root cause for "no Slack Approve/Deny button after v1.11.2 was deployed"**: the proposer built `branchName = "cha/digest-pin/<repo>/<digest[:12]>"`. With `digest = "sha256:18814d01..."`, `digest[:12]` evaluated to `"sha256:18814"` — the `:` is invalid in git ref names. GitHub returned HTTP 422 on `CreateRef`; the error bubbled up through `digestPin.Propose()` and was silently swallowed by `proposeFixes` (which the observability change in this same release surfaces). Net effect on v1.11.0–v1.11.2: every digest-pin candidate that reached the forge stage failed identically, with no log signal.
- New helper `shortDigestHex(digest)` in `ai/proposer/digest_pin.go`: strips any `<algo>:` prefix before slicing 12 hex chars. Output never contains `:` (asserted in tests). Used by both `branchName` and `ActionID` so action IDs also become git-ref-safe.
- New test `TestDigestPin_ShortDigestHex` covers sha256, sha512, no-colon, exact-12-char, empty string; explicit colon-absence assertion.
- **Verified live** against `Bionic-AI-Solutions/storethesoup-k8s` (raw-YAML repo): PR opened with branch `cha/digest-pin/docker4zerocool-storethesoup-wordpress/18814d01b7e1` and correct one-line diff replacing `:6.7-php8.2-wpcli-redis` with `@sha256:18814d01...`.

### Added — Stderr observability for DigestPinProposer outcomes (v1.11.3)

- **Fixes the zero-feedback problem**: prior versions called `digestPin.Propose()` and silently discarded the error (`_ = perr`) plus emitted nothing on the legitimate `(nil, nil)` skip path. Operators rolling out the digest-pin pipeline had no way to tell whether the proposer was skipping because (a) the workload feeder hadn't observed the pod yet, (b) the image wasn't in `--digest-pin-repo-map`, (c) the chart layout didn't match `releasesrc.Detect`, or (d) the forge call errored — all four collapsed to "no Slack button" with no log line.
- **`cmd/cha-com/ai_wiring.go::proposeFixes`** now emits to stderr:
  - On transport error: `digest-pin-proposer: subject=%q error=%v` (PAT / forge / RAG / detect failure visible).
  - On silent skip when the diagnostic IS a `SecurityDrift` digest-pin warning: `digest-pin-proposer: subject=%q skipped (no RAG entry / no RepoMap / no Detect match)`. Distinguishes "wiring is on but matched" from "wiring is on but no PR was opened" from "wiring is off entirely".
- No log spam: only fires on `out[i].Action == nil && digestPin != nil` — the same guard that already gates the proposer call.

### Changed — DigestPinProposer uses OSS `releasesrc.Detect` (v1.11.2)

- **Fixes the silent-skip on docker4zerocool/storethesoup-wordpress and similar repos** that ship raw K8s YAML instead of Helm charts. v1.11.1's proposer called only `DetectInHelmValues`, which returned `ErrNotFound` for non-Helm layouts → proposer silently skipped → no PR.
- Now calls OSS v1.18.2's new `releasesrc.Detect(ctx, files, chartName, repository)` which tries the Helm probe first then falls through to `DetectInRawManifests` (scans `*.yaml`/`*.yml` for inline `image: <repo>:<tag>` lines). Transport errors from the Helm probe still propagate (no silent paper-over).
- **One-line change** in `ai/proposer/digest_pin.go`; existing tests + the 15 DigestPinProposer test cases all still pass.

---


### Added — Workload feeder wired into `cha-com watch` (Phase 2d-γ-3 final wiring)

- **`cmd/cha-com/cluster_knowledge_wiring.go`** — extends `clusterKnowledgeFlags` with `--workload-feeder` + `--workload-feeder-interval` flags + `buildWorkloadFeeder()` + `startWorkloadFeederBackground()`.
- **Critical fix**: without this, the v1.11.0 `DigestPinProposer`'s RAG lookup (`RAGReader.Get(KindWorkload, ...)`) would always miss because nothing writes `kind=workload` entries — meaning **no Approve/Deny buttons would appear on digest-pin findings even after a v1.11.0 cluster roll**. Now the cha-com aiwatch spawns a background goroutine that bootstraps + sweeps every 5 min, walking Deployments / StatefulSets / DaemonSets via the live snapshot Source and upserting workload entries (image + image_digest + owner_chart) into RAG.
- **Depends on OSS v1.18.1** which promoted `internal/feeder` → `pkg/feeder` so cha-com can import it. OSS dep pinned to v1.18.1-pre via pseudo-version; final pin at the v1.18.1 tag.
- **3 new tests** cover disabled-skip, nil-source-or-writer skip, happy-path construction.

---


### Added — DigestPinProposer + Forge wiring into `cha-com watch` (Phase 2d-γ-3 slice 3b-wiring)

- **`cmd/cha-com/digest_pin_wiring.go`** — new `digestPinFlags` flag set + 3 build helpers. Registers the v1.11.0+ `DigestPinProposer` into the running `cha-com watch` process so a `SecurityDrift` digest-pin warning actually opens a PR + emits the `ActionProposePullRequest` proposal. Until this slice, the proposer was code-only.
- **New flags on `cha-com watch`** —
  - `--digest-pin-proposer` (default off) — enable the proposer.
  - `--forge-provider` (default `github`) — `github` today; future `gitlab`/`gitea`.
  - `--forge-token-env` (default `GITHUB_PAT`) — env holding the forge PAT.
  - `--digest-pin-repo-map` (repeatable, format `<image-repo>=<owner>/<repo>[:<ref>]`) — operator-supplied map from image-repo to release-source repo. Example: `--digest-pin-repo-map=docker4zerocool/voice-studio-frontend=Bionic-AI-Solutions/voice-studio-frontend:main`.
- **`cmd/cha-com/ai_wiring.go::proposeFixes`** — extended with a `digestPin *chaproposer.DigestPinProposer` parameter. Runs AFTER the v1.10.0 ManifestBridge fallback: when no FixProposer action and no ProposedPolicyYAML covers the diagnostic, the digest-pin proposer fires (silent skip on RAG miss / no RepoMap entry / no chart layout match; transport errors bubble up to operator log). Mints approve/deny URLs via the existing `minter` so the PR-proposal lands as a clickable button in Slack.
- **`watch_cmd.go` RunE** — constructs the forge client + DigestPinProposer + threads them into `watchLoop`. The `diagnose` subcommand passes `nil` (one-shot CLI doesn't need forge/RAG context).
- **`cluster_knowledge_wiring.go::buildRAGStore`** — new method returning the concrete `*memory.QdrantRAG` (satisfies both `rag.Reader` + `rag.Writer`); old `buildRAGWriter` becomes a back-compat shim that explicitly returns a nil interface when the store is nil (avoids the typed-nil interface gotcha).
- **Fail-open everywhere** — `--digest-pin-proposer=false` (default) → byte-identical to v1.10.x. Explicit error only on half-config: proposer ON + token empty / proposer ON + no RAG / proposer ON + empty repo-map (would silently skip every digest-pin diagnostic).
- **Self-hosted forge** — `--forge-provider=github` today; the validator accepts any HTTPS URL so future GitLab/Gitea backends will just need a new switch case.
- **11 test cases** (`digest_pin_wiring_test.go`): `buildForge` disabled / no-token / unsupported-provider / happy-path; `buildDigestPinProposer` disabled / nil-forge / no-RAG / happy-path / empty-RepoMap; `parseRepoMap` happy-path with 3 entries / empty-entries-skipped / 6 malformed-entry shapes; `register` flag-surface smoke.
- **OSS dep bump** `cluster-health-autopilot v1.16.0 → v1.17.0` (final pin; carries pkg/releasesrc + ActionProposePullRequest + workload feeder, all of which this slice depends on).


### Added — DigestPinProposer + Forge→RepoFiles adapter (Phase 2d-γ-3 slice 3b-core)

- **`ai/proposer/digest_pin.go`** — new `DigestPinProposer` (deterministic, non-LLM) that turns a `SecurityDrift` digest-pin warning into a signed `ActionProposePullRequest` by matching the diagnostic class → RAG workload lookup → image-repo → forge mapping → `pkg/releasesrc.DetectInHelmValues` → subchart-safe tag patch → `CreateBranch` + `UpdateFile` + `CreatePullRequest` → emit the proposal.
- **`ai/forge/repo_files.go`** — new `RepoFilesAdapter` that wraps a `Forge` into the OSS `pkg/releasesrc.RepoFiles` interface for a single `(owner, repo, ref)` tuple.
- **Subchart-safe `patchTagToDigest`** scopes the tag-line rewrite to the few lines AFTER a matching `repository:` line.
- **Idempotent forge interaction** — `CreateBranch` `ErrBranchExists` falls through to `UpdateFile` + `CreatePullRequest`.
- **Fail-open at every precondition** — all skips return `(nil, nil)`. Forge transport errors propagate.
- **15 test cases** — happy path; `Name()`; nil-receiver; wrong-class skips; RAG miss; no digest; unmapped image; no chart layout; `ErrBranchExists` fall-through; transport-error; Validate round-trip; `stripPodReplicaSuffix`; `splitImageTag`; `patchTagToDigest` variants + subchart isolation.

### Added — Importance scoring from outcome history (Phase 2d-α-3, #28)

- **`ai/memory/rag_qdrant.go::AppendSignal`** now adjusts `Importance` per signal Action (`approved` +0.05 / `denied` −0.05 / `silenced` −0.10 / etc). Clamped to [0.0, 1.0]. 13 tests.

### Added — `ActionProposePullRequest` executor handler (Phase 2d-γ-3 slice 3c, #27)

- **`ai/approval/executor.go`** — `MutatorExecutor.Execute` handles the new `ai.ActionProposePullRequest` ActionKind. Approve = no-op success (audit + RAG carry the signoff signal). No cluster mutation. 5 tests cover happy path + every rejection class.

### Added — Cluster-knowledge RAG writer + Cloudflare feeder wiring (Phase 2d-α-2, runtime activation, #26)

- **`cmd/cha-com/cluster_knowledge_wiring.go`** — wires the v1.10.0 CF feeder library into running `cha-com watch`. New flags: `--rag-store-url`, `--rag-collection`, `--cluster-name`, `--cloudflare-feeder`, `--cloudflare-token-env`, `--cloudflare-feeder-interval`. Backward compatible, fail-open, 10 tests.

---

## [1.10.1] — 2026-06-02

Maintenance release: removes the duplicate ApplyManifest bridge code
from cha-com now that the OSS package owns it. No behavior change in
cha-com itself; pairs with OSS v1.16.0 which adds the new public
`pkg/ai.ManifestBridge` + `pkg/ai.BuildApplyManifestProposal` so the
OSS watcher can mint approve/deny URLs directly (closing the gap
where ProposedPolicyYAML-bearing diagnostics had URLs minted in the
cha-com aiwatch process but never reached the OSS-written Slack /
Alertmanager / OpenProject surfaces).

Pinned OSS: v1.16.0.

### Changed

- OSS dep pin: `cluster-health-autopilot v1.15.0 → v1.16.0`.
- `cmd/cha-com/ai_wiring.go::proposeFixes` now calls the exported
  `pkgai.BuildApplyManifestProposal` instead of the local copy.
- Deleted the local `buildApplyManifestProposal` + `parseManifestTarget` +
  `manifestTarget` helpers (now live in OSS `pkg/ai/manifest_bridge.go`).
- Deleted the corresponding unit tests in
  `cmd/cha-com/apply_manifest_bridge_test.go` (moved to OSS
  `pkg/ai/manifest_bridge_test.go`); kept the three `proposeFixes`
  integration tests that exercise the cha-com wiring (bridge runs
  as fallback when no FixProposer covers a diagnostic).

### Removed

- `sigs.k8s.io/yaml` + `k8s.io/apimachinery/.../unstructured` imports
  from `cmd/cha-com/ai_wiring.go` — both were only used by the deleted
  bridge helpers. `sigs.k8s.io/yaml` stays in `go.mod` (promoted from
  indirect to direct) because `ai/approval/executor.go` still uses it
  for the apply-time manifest parser.

---

## [1.10.0] — 2026-06-02

Bundles Phase 2d-α/δ/γ feature work + the critical UX fix: NetworkPolicy findings now render Approve/Deny buttons in Slack.

Pinned OSS: v1.15.0 (adds `ActionApplyManifest` + safe-apply validator in `pkg/ai`).

### Added — Slack Approve/Deny buttons for NetworkPolicy findings (Phase 2d-δ-2, #23)

- **The fix for missing Slack buttons.** Before this release, the OSS `NetworkPolicyProposer` (v1.13.0+) emitted a ready-to-apply NetworkPolicy YAML in `Diagnostic.ProposedPolicyYAML` for every namespace missing default-deny coverage — but cha-com aiwatch ignored the field, no approval URL was minted, and Slack rendered the finding without buttons. SREs had to copy-paste kubectl by hand.
- New bridge in `cmd/cha-com/ai_wiring.go::proposeFixes`: when no FixProposer action covers a diagnostic AND the diagnostic carries `ProposedPolicyYAML`, builds an `AIProposedAction{ActionKind: ActionApplyManifest, ManifestYAML, ...}` and runs it through `pkg/ai.Validate` → `ValidateManifest`'s closed-Kind/safe-shape gate before minting the signed approve+deny URL pair.
- New `ActionApplyManifest` case in `ai/approval/executor.go` parses the manifest at apply time (GVR derived from manifest apiVersion + Kind via the closed `applyManifestGVRs` map — currently `NetworkPolicy → networking.k8s.io/v1/networkpolicies`) and calls `Mutator.Create`. Post-apply verification runs as for any other action kind.
- Fail-closed at every layer: unsafe shapes (Egress in policyTypes, non-`0.0.0.0/0` ipBlock, protected namespace, RoleBinding et al) silently drop to no Action → no buttons. Defense-in-depth: validator runs at proposal time AND inside `Execute`.

### Added — Cloudflare zone-discovery feeder (Phase 2d-α-2, #20)

- `ai/memory/cloudflare_feeder.go`: walks every DNS record in every Cloudflare zone the account can see, upserts each routable hostname (A/AAAA/CNAME) as a `kind=apex_domain` Entry into the cluster RAG via the OSS `pkg/rag.Writer` interface. The OSS Endpoints probe's `LearntEndpointTargets` (v1.11.0+) reads from this same RAG every probe cycle, so apex / Cloudflare-only hostnames the OSS Ingress discovery can't see now become first-class probe targets without operator hand-curation.
- `HTTPCloudflareClient`: minimal Cloudflare API v4 client (`/zones`, `/zones/{id}/dns_records`) with pagination + bearer auth. Aiwatch wiring lands in v1.11 (this release only ships the library).
- Fail-open per zone; importance-score 0.6 (above OSS `ImportanceMin` default 0.3); periodic 24h sweep + bootstrap-on-start.

### Added — QdrantRAG store (Phase 2d-α-1, #19)

- `ai/memory/rag_qdrant.go`: production-grade `pkg/rag.Reader + Writer` implementation over Qdrant. List with payload-filter + importance sort, Get-by-key, Upsert with `FirstSeen` preservation, AppendSignal with create-on-demand + bounded log retention, 30-day-halflife Decay sweeper.
- Nil receiver = complete no-op (matches OSS `NoopReader` contract).
- HTTP-fault tolerant: failed Upserts soft-fail (memory writes never block the proposal pipeline).

### Added — GitHub forge client (Phase 2d-γ-1 + 2d-γ-2, #22 + #24)

- `ai/forge/forge.go`: provider-agnostic `Forge` interface (GitLab support comes later) over a minimal GitHub REST v3 client.
- **Read ops (#22):** `Whoami`, `GetFileContent` (contents API with base64 decode), `ListRepoFiles` (Git Trees API with glob filter, truncated-response refusal). Tiny built-in `**` / `*` matcher (no `doublestar` dep).
- **Write ops (#24):** `CreateBranch` (idempotent on same commit; `ErrBranchExists` on different commit), `UpdateFile` (atomic via `priorSHA` guard — wrong SHA → 409 prevents clobber), `CreatePullRequest`.
- Auth errors mapped to actionable messages (`"token scope?"`); 404/409 surfaced with clean text.
- Unblocks 2d-γ-3 (digest-pin proposer wired to forge — next release).

### Added — explicit Deny path on the approval-server (#17, was pending since v1.9.4)

- New `/deny?token=<JWT>[&reason=<text>]` endpoint, symmetric with `/approve`. Same auth + token verification. Token one-shot across the pair: denial 409s subsequent approve and vice versa.
- Renders a "Proposal declined" HTML page; audits `ai.proposal.denied`; records denial to the RAG memory loop (`Outcome{Verdict:"denied"}`).
- `approvalURLMinter.actionURL()` returns BOTH the approve and the deny URL sharing the same signed token. Watcher tick output emits both lines.
- Closes adversarial-review finding #1: silent expiry was the only previous rejection path.

### Changed

- OSS dep pin: `cluster-health-autopilot v1.14.0 → v1.15.0` (#21).

---

## [1.9.3] — 2026-05-30

Rolls up the post-v1.9.2 commits — needed on the cluster to exercise the G10 approval-HA wiring (chart 1.8.12) since v1.9.2 predates PR #16 and doesn't recognize the `--store-backend` flag.

### Added — approval-server HA (P4/G10)

- New `--store-backend=configmap` for the `cha-com approval-server` subcommand. With `inmemory` (default) the replay (JTI) + T3 runbook approval stores are process-local — only safe at a single replica. With `configmap` both stores are shared across replicas via Kubernetes ConfigMaps, using optimistic CAS on `resourceVersion`: a JTI used on replica A cannot be replayed on B, and concurrent T3 clicks on different replicas serialize cleanly through the same dual-approver + 30-min-window invariants. Expired replay entries are pruned amortized over writes; no separate sweeper needed. New flags: `--store-namespace`, `--store-replay-configmap` (default `cha-approval-replay`), `--store-runbook-configmap` (default `cha-approval-runbooks`). Chart support (replicas>1 + ConfigMap RBAC for the approval-server SA) ships in OSS chart 1.8.12.

### Fixed

- `cha-com eval` against a brand-new RAG store now reports an empty corpus (instead of 404-erroring) — the Qdrant collection is created lazily on first `Record()`.

---

## [1.9.2] — 2026-05-30

Supersedes the unpublished v1.9.0/v1.9.1 attempts. The goreleaser default top-level timeout is 1h, but the multi-arch docker build (amd64 + arm64) takes ~40 min on top of the ~19 min Go cross-build. v1.9.0 tripped the limit; v1.9.1 attempted a config fix (`timeout: 2h` in `.goreleaser.yaml`) but that field doesn't exist on goreleaser v2's `config.Project`, so it failed at config-load. v1.9.2 passes `--timeout 2h` to the goreleaser CLI via `release.yml` (the correct path).

No code changes vs the v1.9.0 attempt — the P2 + P3 program below ships as v1.9.2.

## [1.9.1] — 2026-05-30 (UNPUBLISHED — bad goreleaser config)

## [1.9.0] — 2026-05-30 (UNPUBLISHED — superseded)

The P2 + P3 program: RAG-grounded proposals, live-state verification gates, and confidence-gated autonomy. The autonomous loop runs end-to-end — observe → propose → ground in verified priors → confidence-gate → re-validate live state → apply → verify → record outcome → learn — with a circuit breaker bounding blast radius and an eval harness to validate the confidence threshold from data.

### Added — RAG grounding for proposals (P2/G5c, retrieve + write halves)

- The T0 enricher and T1 fix-proposer now optionally ground in prior resolutions retrieved from the dedicated RAG store (`ai/memory`). New `PriorRetriever` (satisfied by `*ai/memory.Memory`); a shared `<prior_resolutions>` prompt block frames priors as evidence, not authority ("prefer verdict=cleared; the runtime re-validates against live state before applying"). Nil-safe: no store configured → proposers reason without RAG, unchanged.
- New `--memory-store-url`, `--memory-embeddings-endpoint` (defaults to `--ai-endpoint`), `--memory-embeddings-model`, `--memory-topk` flags; embeddings reuse the `--ai-api-key-*` auth. Memoized `buildMemory()`.
- **Write half (closes the loop):** the approval-server now records each verified apply outcome into the RAG store via an optional `OutcomeRecorder` (best-effort — a recording failure is audited `ai.memory.record_failed` but never fails the apply, since the mutation already landed). `ExecutionResult.VerificationAttempted` distinguishes "verified, still present" (`still-present`) from "no verification possible" (`not-verifiable`); `VerdictFor()` maps the result to the memory verdict. The same `--memory-*` flags are now accepted by the `approval-server` subcommand, so the writer and the proposer's reader share one store.

### Added — live-state verification gates (P2/G6)

- **Precondition gate** (`--precondition`, default on): before applying an approved fix, the approval-server re-runs the analyzers once and **skips the action as a benign no-op if the triggering finding has already cleared** — so a stale (possibly RAG-grounded) proposal never mutates a cluster that already self-healed. Renders an "Already resolved" page (HTTP 200) and audits `ai.action.skipped_precondition`; no mutation, no failure. New `approval.PreconditionPolicy` (composes the protected-namespace check first) + `ai.PostApplyVerifier.Present()` single-shot check.
- **Post-apply verification wired** (`--post-apply-verify`, default on; `--verify-window` 30s, `--verify-delay` 3s): the approval-server now actually attaches the `PostApplyVerifier` to its executor (previously absent → every recorded verdict was `not-verifiable`). One verifier, built from the merged analyzer registry + the live source, powers both gates. This makes the RAG verdict (`cleared`/`still-present`) meaningful, so the loop can prefer fixes that demonstrably worked.

### Added — confidence-gated autonomy (P3/G7)

- **Decider (G7a)** — pure `ai.DecideAutonomy(proposal, priors, breakerOpen, cfg)` → `AutonomyDecision{AutoApply, Confidence, Reason}`: the highest-stakes gate in CHA, defense-in-depth. Auto-apply (no human approval) is granted ONLY when ALL hold: autonomy enabled, circuit breaker closed, action in a low-risk allowlist, target namespace not protected, proposal reversible (has rollback), and confidence ≥ threshold (default 0.85). Confidence = the highest similarity among priors that BOTH cleared the finding AND used the same action kind — a cleared prior with a different action, or a near-match that did NOT clear, grants zero confidence. The zero-value config is safe (disabled); an empty allowlist refuses everything.
- **Wiring (G7b)** — `cha-com watch --autonomy` (default OFF). For each new proposal the loop runs the decider; when it passes, the action is applied through the SAME executor the approval-server uses, so it inherits the G6 precondition re-check + post-apply verification. Outcomes flow to the circuit breaker (a verified clear resets it; an applied-but-unverified fix or an exec error counts toward tripping it) and into the RAG store with `delivery=autonomy`, so autonomous results feed the same learning loop. A precondition skip is benign (no mutation, no breaker hit). New flags `--autonomy`, `--autonomy-min-confidence` (default 0.85), `--autonomy-allow` (default `DeletePod,DeleteCertRequest,DeleteACMEOrder`; excludes `PatchDeployment`/`DeleteJob`). Requires `--memory-store-url` (the confidence signal). The tick output shows `[AUTO] Applied + verified / Applied / Skipped / Apply failed / Declined`; a decline or failure falls back to the click-to-fix link.

### Added — remediation eval harness (P3/G8)

- New `cha-com eval` subcommand + pure `ai/eval` package: reports remediation quality over the resolution corpus — overall + per-action-kind + per-delivery clear rates (cleared / (cleared + still-present); not-verifiable excluded), the autonomy-eligible clear rate (for a given allowlist), and a **confidence-calibration curve** (clear rate bucketed by retrieval similarity). The calibration curve is the evidence for the `--autonomy-min-confidence` threshold: it shows whether higher similarity actually predicts a higher clear rate, so operators can validate (or tune) the 0.85 default before enabling autonomy. Reads the **live RAG store** (`--memory-store-url`, via a new `QdrantStore.ScanAll` scroll-paginated scan) or an offline JSONL dump (`--corpus`). `ai/eval` is pure + fully unit-tested.

---

## [1.8.6] — 2026-05-29

Pinned to OSS [`v1.8.6`](https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/releases/tag/v1.8.6) (was v1.8.2). Picks up the OSS P0 signal-hygiene fixes (HPA scale-to-zero → Warning, cert-manager ACME-solver ingresses skipped) in the merged catalog the aiwatch runs.

### Added (earlier on this line)

- **Click-to-fix delivery** (`--approval-server-url`): T1/T2 proposals now emit a signed one-click approval-server link instead of a placeholder ActionID — closes the proposal-delivery last-mile gap. Load-only key handling; soft-fail to ActionID.

---

## [1.8.2] — 2026-05-28

Pinned to OSS [`v1.8.2`](https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/releases/tag/v1.8.2) (was v1.6.1-pseudo). No CHA-com source changes — the OSS API additions across v1.7→v1.8.2 were additive, so the paid binary compiles, tests, vets, and lints clean against the new dependency.

### Changed — OSS engine bumped v1.6 → v1.8.2

`osscatalog.RegisterOSS(reg)` now registers the full v1.7/v1.8 detection surface into the paid binary alongside the CHA-com AI tier + paid analyzers:

- **v1.7 drift classes**: GitOps / WorkloadState / RBAC drift.
- **v1.8 drift classes**: Config / Capacity / Security drift.
- **v1.8 M2 K8s probes**: Kong / HPAScaling / ArgoCDApplication / Velero (auto-skip when CRD absent).
- **v1.8 cloud probes**: 30 probes (10 each AWS / GCP / Azure) with all three Live SDK wrappers, including the v1.8.2 "not measured" honesty fixes for the GCP/Azure signals that need the Monitoring API.

Previously the paid binary shipped a v1.6-era engine; this closes the detection-coverage gap so a CHA-com deployment is not a regression versus OSS.

---

## [1.6.0] — 2026-05-25

Pinned to OSS [`v1.6.0`](https://github.com/Bionic-AI-Solutions/cluster-health-autopilot/releases/tag/v1.6.0).

### Added — Sprint 3: AI safety hardening

- **Patch-payload semantic validator** (`ai/approval/patch_validator.go`)
  closes the StatefulSet-replicas-zero data-loss vector from the
  2026-05-22 threat model. The closed-enum `ActionKind` whitelist gates
  *verbs* (Delete vs Patch); this gates *shape*. `ActionPatchDeployment`
  permits exactly `spec.template.metadata.annotations.kubectl.kubernetes.io/restartedAt`;
  anything else (replicas, selector, container images, immutable
  fields, additional annotations) returns `ErrPatchForbidden`. Payload
  size capped at 64 KiB; restart-annotation value at 256 characters.
  Wired into `MutatorExecutor.Execute` before the Mutator.Patch call.
  10 unit tests.

- **Independent investigation rate budget** (`ai/rate_limit.go::TakeInvestigation`)
  closes the cost-DoS amplification path. Layer-2 LLM-backed
  investigation calls now have a separate `(approver, diagnostic_class)`
  token bucket (default 10/hour) independent of the proposal budget.
  Per-class overrides via `PerInvestigationClass` config. Without this,
  a flapping workload could uncapped-burn ~144 investigations/day per
  resource. 4 unit tests.

- **Cold-start bucket mitigation** (`ai/rate_limit.go::newScopedBucket`).
  New rate-limit buckets initialize at 0 tokens by default rather than
  full capacity. An attacker who can trigger approval-server restarts
  no longer extracts a free `ActionsPerHour`-sized burst on each
  restart. `ColdStartFull: true` re-enables the legacy
  burst-on-startup behavior for stable, long-running deployments.
  3 unit tests; pre-existing tests updated to opt into `ColdStartFull`.

- **Tamper-evident audit chain** (`ai/audit/hash_chain.go`). `ChainedSink`
  wraps any `pkgai.AuditSink` and embeds two SHA-256 fields in every
  event's `Details`: `prev_hash` (the previous entry's `entry_hash`)
  and `entry_hash` (this entry's hash including `prev_hash`).
  `VerifyChain([]AuditEvent) (int, error)` walks the chain and
  returns the index of the first broken link — catching content
  mutation, reordering, and insertion/deletion. Not a signing scheme
  (tamper *evidence*, not *resistance*); layer over an append-only
  Vault audit device for full resistance. Inner-sink errors leave the
  chain state unchanged so retries resume from the correct prev_hash.
  7 unit tests.

### Added — Sprint 4.5: OSS/paid boundary exerciser

- **`PaidBoundaryAnalyzer`** (`catalog/paid_analyzer_boundary.go`).
  Deliberately-trivial Analyzer registered by `catalog.Register()`
  whose only purpose is to fail the CHA-com CI build at the
  `var _ diagnose.Analyzer = PaidBoundaryAnalyzer{}` compile-time
  assertion when the OSS `pkg/diagnose.Analyzer` interface drifts.
  Returns no diagnostics; runtime safety verified by 3 unit tests
  (`AnalyzerRegistersIntoRegistry`, `RunIsNoop`, `NameStable`).
  Real paid analyzers register in additional files in this package.

### Changed

- `MutatorExecutor.Execute` now calls `ValidatePatch(p)` for
  `ActionPatchDeployment` proposals before the Mutator.Patch call.
- Pre-existing rate-limit tests updated to set `ColdStartFull: true`
  since they explicitly tested the burst-on-startup pattern that the
  Sprint 3.3 mitigation now disables by default.

### Notes

The OSS `pkg/ai.RedactEvents` (Sprint 3.4) is consumed via the
`internal/investigator.LiveEnvironment.GetEvents` path — CHA-com's
LLM-backed investigator inherits the scrubbing transparently. The
`Diagnostic.Message` secret-heuristic scrub (Sprint 3.4b) similarly
covers the enricher and fix-proposer paths through `RedactDiagnostic`.

---

For releases earlier than 1.6.0, see git history on the `main` branch.
