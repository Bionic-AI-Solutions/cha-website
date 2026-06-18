// Single source of truth for product counts shown anywhere on the site.
//
// Ground truth (count the registrations, don't trust prose).
// Verified against the v1.26.0 tag (`git show v1.26.0:<path>`) on 2026-06-12:
//   - K8S_PROBES / OSS_ANALYZERS:
//       cluster-health-autopilot/catalog/catalog.go (RegisterOSS)
//       Probes    = 21 env-gated default-on RegisterProbe calls
//                   (6 base + 15 later additions, each CHA_PROBE_*=off
//                   togglable).
//       Analyzers = 20 env-gated default-on RegisterAnalyzer calls.
//                   (VaultPathMissing is intentionally NOT registered
//                   there — it needs an operator-supplied Vault client —
//                   so it is not counted.)
//   - CLOUD_PROBES_*:
//       cluster-health-autopilot/catalog/cloud.go (RegisterCloudOSS)
//       9 env gates per provider, but the EKS/GKE/AKS gate registers
//       TWO probes (control plane + node groups/pools) each:
//       10 AWS + 10 GCP + 10 Azure = 30.
//   - WATCHED_GVRS:
//       cluster-health-autopilot/internal/watcher/watcher.go (watchedGVRs)
//       20 entries: 15 base (Pod..Certificate) + Ingress, HPA,
//       ArgoCD Application, KEDA ScaledObject + EndpointSlice
//       (discovery.k8s.io/v1, added in PR #199 / v1.26.0).
//   - Versions: latest release tags of the two repos
//       (OSS: cluster-health-autopilot, paid: CHA-com).
//       PRE-ALPHA RE-BASELINE (2026-06-17): both products re-numbered to
//       v0.1.0-alpha.1. The prior 1.x tags (OSS ≤ v1.26.3, paid ≤ v1.22.4)
//       were mis-numbered pre-launch / pre-alpha iterations, now all marked
//       pre-release. Nothing has shipped GA yet.
//
// When a release adds/removes a probe or analyzer, update THIS file only;
// every page imports from here.
//
// NOTE: onepager.astro and index.astro ASCII diagrams embed these numbers in
// fixed-width art — re-check alignment when digit counts change.

export const K8S_PROBES = 21;
export const OSS_ANALYZERS = 20;
export const WATCHED_GVRS = 20;

export const CLOUD_PROBES_AWS = 10;
export const CLOUD_PROBES_GCP = 10;
export const CLOUD_PROBES_AZURE = 10;
export const CLOUD_PROBES_TOTAL =
  CLOUD_PROBES_AWS + CLOUD_PROBES_GCP + CLOUD_PROBES_AZURE;

export const OSS_VERSION = 'v0.1.0-alpha.1';
// Pin download URLs to this tag — never link releases/latest/download/
// (chart-releaser releases carry NO binaries).
// PRE-ALPHA: the v0.1.0-alpha.1 GitHub release is being cut now; the OSS
// release artifacts (the four _<os>_<arch>.tar.gz assets) will exist
// shortly — assets on the v0.1.0-alpha.1 GitHub release.
export const BINARY_RELEASE = 'v0.1.0-alpha.1';
// Latest CHA-com git TAG. PRE-ALPHA re-baseline: prior 1.x tags
// (≤ v1.22.4) were pre-launch / pre-alpha iterations, now pre-release.
// Consumed by the roadmap page (shippedOnly guard).
export const PAID_VERSION = 'v0.1.0-alpha.1';
