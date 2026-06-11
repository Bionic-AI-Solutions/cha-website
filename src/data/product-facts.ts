// Single source of truth for product counts shown anywhere on the site.
//
// Ground truth (count the registrations, don't trust prose):
//   - K8S_PROBES / OSS_ANALYZERS:
//       cluster-health-autopilot/catalog/catalog.go (RegisterOSS)
//       Probes    = 6 in the base RegisterProbe call + 15 env-gated
//                   default-on registrations = 21.
//       Analyzers = 7 in the base RegisterAnalyzer call + 13 env-gated
//                   default-on registrations = 20. (VaultPathMissing is
//                   intentionally NOT registered there — it needs an
//                   operator-supplied Vault client — so it is not counted.)
//   - CLOUD_PROBES_*:
//       cluster-health-autopilot/catalog/cloud.go (RegisterCloudOSS)
//       10 AWS + 10 GCP + 10 Azure = 30.
//   - WATCHED_GVRS:
//       cluster-health-autopilot/internal/watcher/watcher.go (watchedGVRs)
//       19 entries: 15 base (Pod..Certificate) + Ingress, HPA,
//       ArgoCD Application, KEDA ScaledObject.
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
export const WATCHED_GVRS = 19;

export const CLOUD_PROBES_AWS = 10;
export const CLOUD_PROBES_GCP = 10;
export const CLOUD_PROBES_AZURE = 10;
export const CLOUD_PROBES_TOTAL =
  CLOUD_PROBES_AWS + CLOUD_PROBES_GCP + CLOUD_PROBES_AZURE;

export const OSS_VERSION = 'v1.25.1';
// Newest release with goreleaser binary assets (all 4 arches verified HTTP 200 on 2026-06-11).
// `releases/latest` (chart tags carry no binaries), so ALWAYS pin download
// URLs to this tag — never link releases/latest/download/.
// Verified 2026-06-11: all four _<os>_<arch>.tar.gz assets return HTTP 200.
export const BINARY_RELEASE = 'v1.25.1';
// Latest CHA-com git TAG (v1.22.0 is untagged HEAD); bump when v1.22.0 tags.
// Exported for the roadmap page (a later task will consume it).
export const PAID_VERSION = 'v1.21.0';
