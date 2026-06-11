<!-- DO NOT EDIT — vendored snapshot of CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- source: CHANGELOG.md (Bionic-AI-Solutions/CHA-com, private) -->
<!-- synced: 2026-06-11 -->
<!-- re-sync: ./scripts/sync-changelogs.sh && npm run build -->
<!-- truncated to newest 12 release sections; the public roadmap renders these only -->

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

