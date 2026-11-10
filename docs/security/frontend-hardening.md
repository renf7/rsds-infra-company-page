# Frontend security controls — RSDSINFRA-35

## Review boundary

CODEOWNERS covers delivery/scanner/runtime configuration and lockfiles. It does not
itself enforce approvals. The connector receives 403 for branch-protection access.
A repository administrator must require PRs, code-owner review, stale approval
dismissal, approval after the last push and strict existing security checks plus
`zizmor workflow security` and `ZAP passive local baseline`. Preserve existing rules.
Add an independent write-access owner when renf7 authors a PR: self-approval is not
possible. No paid plan/trial is required for these public-repository controls.

## Workflows and credentials

zizmor 1.32.0 audits all workflow files offline without a GitHub token, on every PR
opened/synchronize/reopened/edited/ready_for_review event and main/scheduled runs.
No repository audit suppressions are added. Workflow and scanner changes themselves
require review. Publishing is main-only; checkout credentials are not persisted,
contents is read-only, and Docker Hub credentials appear only in the login action
following the scan. Only the publishing job has id-token:write for keyless Cosign.
PR workflows never publish/sign or receive registry credentials.

## Image evidence and verification

BuildKit produces an SPDX SBOM and minimal provenance. Containerd image storage
preserves them through load -> Trivy scan -> Docker Hub push, without rebuilding.
The published immutable index digest is signed with Cosign 3.1.4 using GitHub OIDC;
its ephemeral certificate and transparency entry replace a long-lived signing key.
The job verifies the signature with the exact expected workflow identity, and retains
SBOM/provenance/index/signature verification JSON for seven days. Public Sigstore
transparency metadata is public: no secrets may be passed as build arguments.

Consumers must verify by digest (substitute the published sha256 digest):

```bash
image=renf7/rsds-infra-company-page@sha256:YOUR_DIGEST
cosign verify "$image" \
  --certificate-identity 'https://github.com/renf7/rsds-infra-company-page/.github/workflows/docker-build.yml@refs/heads/main' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com'
docker buildx imagetools inspect "$image" --format '{{ json .Provenance.SLSA }}'
docker buildx imagetools inspect "$image" --format '{{ json .SBOM.SPDX }}'
```

Verify the signature before trusting attached metadata; inspect expected source
repository/revision in provenance and use the immutable reference for deployment.
No GitHub-hosted artifact attestation entitlement or Docker Scout subscription is
required. GitHub-hosted attestations are available free for public repositories,
but this implementation uses registry BuildKit metadata and public Sigstore instead.
Successful Docker Hub publishing/signature retention requires a real trusted-main run
post-merge. PR CI must not publish just to test those credentials.

Official references:
- https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
- https://docs.docker.com/build/metadata/attestations/
- https://docs.sigstore.dev/quickstart/quickstart-ci/
- https://docs.sigstore.dev/cosign/verifying/verify/

## Passive local web check

Run `bash tools/security/zap-baseline.sh` with local Docker (on Windows, Git Bash/WSL,
or follow the equivalent Docker invocations in the script). There is deliberately
no target argument. It builds the frontend, creates a unique internal Docker network,
and runs the official digest-pinned ZAP 2.17.0 baseline against `http://site:8080`.
No published host port, external network, real login account or active attack scan.
Bounded spidering is followed by passive response inspection. Warnings fail the
check; reports are retained under `.validation/zap` and cleanup removes only owned
containers/network. This is complementary to code/image scans, not full penetration
testing. Source reports do not include credentials because the site is anonymous.

The standalone image now hides the nginx version and adds DENY/nosniff/referrer/CSP
headers. JSON-LD CSP hashes are generated from the exact built HTML. Scripts/styles
stay same-origin; country lookup uses only api.country.is. These are standalone image
headers: Helm mounts its own nginx configuration, so do not infer EKS headers from
this test. Production ingress/proxy policy needs its own coordinated acceptance.
