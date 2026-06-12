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

export const OSS_VERSION = 'v1.26.0';
// Newest release with goreleaser binary assets. `releases/latest` resolves
// to a chart-releaser release that carries NO binaries, so ALWAYS pin
// download URLs to this tag — never link releases/latest/download/.
// v1.26.0: the goreleaser release is building as of 2026-06-12 — the four
// _<os>_<arch>.tar.gz assets have NOT yet been re-verified HTTP 200 for this
// tag (v1.25.1 assets were verified 2026-06-11). Re-verify once the release
// workflow finishes.
export const BINARY_RELEASE = 'v1.26.0';
// Latest CHA-com git TAG; v1.22.2 is the first buildable 1.22-line release
// (v1.22.0/v1.22.1 image builds failed on release-config allowlists);
// binaries+SBOMs verified on the GitHub release 2026-06-12.
// Consumed by the roadmap page (shippedOnly guard).
export const PAID_VERSION = 'v1.22.2';
