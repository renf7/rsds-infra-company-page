# rsds-infra-company-page

Apple sign-in is deferred by the owner until the website generates profit
([RSDSINFRA-32](https://rsdsoftware.atlassian.net/browse/RSDSINFRA-32), SCRUM Sprint 0,
parent RSDSINFRA-8). Apple's Developer Program normally costs US$99 per year or
the local equivalent: https://developer.apple.com/programs/ . The login dialog
does not display Apple, even if backend provider discovery reports it enabled.
Existing backend/Helm support is retained for a future explicit decision to fund,
configure and validate live Apple sign-in. Do not re-enable it as routine provider setup.

React and TypeScript company website for **RSD Software EU**, built with Vite and served by nginx. Tracking: [RSDSINFRA-5](https://rsdsoftware.atlassian.net/browse/RSDSINFRA-5).

RSD Software EU builds robust Java software with AI-powered support, delivered by experienced
software professionals. This repository contains the marketing landing page and the
Docker packaging used to ship it.

## What's in this repository

```
rsds-infra-company-page
├── public
│   ├── robots.txt       # crawler rules and sitemap discovery
│   ├── sitemap.xml      # localized page discovery
│   ├── styles.css       # preserved production responsive CSS
│   └── logo.png         # organization and social-preview logo
├── src                  # reusable components, typed EN/PL content and language hook
├── index.html           # English metadata and Vite entry
├── pl/index.html        # Polish metadata and Vite entry
├── scripts
│   ├── prerender.tsx    # complete localized HTML at build time
│   └── validate-seo.py  # validates generated dist/ output
├── tests                # unit contracts, frozen static fixtures and browser comparisons
├── Dockerfile           # Node build, non-root nginx serving dist/ on port 8080
└── .github/workflows
    ├── docker-build.yml   # builds and publishes main
    └── seo-validation.yml # validates every pushed branch
```

The two language entries share React components and typed localized content. Build-time pre-rendering plus browser hydration retains complete indexable HTML without a production Node server. Original CSS/assets and native anchors remain intact. Two known language entry points do not need a router dependency.

## Development and tests

Use Node 26 LTS (26.13 or newer within that major) and npm. Exact dependencies are locked; do not force incompatible peer dependencies. Docker builds require no host Node installation.

```sh
npm ci --ignore-scripts
npm run dev
```

Open the displayed Vite URL (normally `http://localhost:5173/`); Polish is `/pl/`. Verify production output with:

```sh
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run preview
```

Vitest/Testing Library test frozen EN/PL DOM/content, storage/country/timeout language behavior, hydration and pre-rendering. Coverage thresholds are 80% for lines, statements, branches and functions. See [migration evidence](docs/react-migration-plan.md) and [version compatibility](SCANNER-VERSIONS.md).

## Headless browser and Helm checks

SSO feature (RSDSINFRA-19): the header now has an accessible English/Polish login dialog for Facebook, Microsoft, Google and GitHub, with cookie-based session/logout. The existing marketing CSS/content/assets remain preserved. Authenticated UI state comes from the backend; JavaScript never stores or decodes JWTs for authorization. A standalone/frontend-only image reports an anonymous session and unavailable providers, never a simulated login.

For the full Spring/DynamoDB/provider-protocol test stack, use the runner's `local-test-auth.json`, frontend PR #17, auth-service PR #1, Helm PR #9 and runner PR #1 until merged. The expanded suite is 36 tests (16 marketing + 20 authentication), with real callbacks/JWT cookies/database requests. Provider registrations are not available, so the external provider boundary is explicitly a local protocol fixture; live-provider acceptance remains pending. Auth additions intentionally change header controls; strict visual comparisons cover unchanged main/footer regions (8 desktop/mobile EN/PL comparisons), while original header DOM, responsive navigation and new keyboard/mobile auth behavior have separate contracts.

React CI runs the 16 existing headless behavior tests from a pinned `rsds-infra-local` revision against the production image. It also tests direct navigation/refresh without JavaScript on `/`, `/index.html`, `/pl/` and `/pl/index.html`; four EN/PL desktop/mobile screenshot comparisons require zero differing pixels against pre-migration commit `d8eabc402529f57a245134007c362e456d1f0042`. Browser reports, screenshots and coverage are retained as CI artifacts. Containers are built without publishing or deploying production.

For the actual chart on your own Docker engine, follow the [local runner runbook](https://github.com/renf7/rsds-infra-local/blob/RSDSINFRA-25-local-testing/README.md), build its implementation branch, and run from that repository root:

```powershell
.\out\rsds-local.exe up --docker-context desktop-linux --pr rsds-infra-company-page=8 --e2e --port 18089 --workdir .local-react-review
.\out\rsds-local.exe status --workdir .local-react-review
.\out\rsds-local.exe down --workdir .local-react-review
```

Use your actual local context; Linux/macOS use `./out/rsds-local`. Unspecified repositories use their default branches. E2E is disabled unless `--e2e` is explicitly supplied. Require the report's intended PR head, `status=PASS`, `e2eEnabled=true` and 16 passing tests. Run `down` after reviewing; reports are preserved. Local use needs no GitHub/Sonar token, cloud credentials or host browser.

## Build the image locally

```bash
docker build -t rsds-infra-company-page .
```

## Run the image locally

```bash
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m,mode=1777 \
  -p 8080:8080 rsds-infra-company-page
```

Then open:

```
http://localhost:8080
```

## Validate search metadata

```bash
npm run build
python -m pip install -r scripts/requirements.txt
python scripts/validate-seo.py
```

The same validation runs automatically after every push to any branch. It checks
language declarations, titles, descriptions, headings,
canonical URLs, reciprocal `hreflang` links, local assets, social metadata,
structured data, `robots.txt`, and `sitemap.xml`.

Visitors who first enter `/` from a Polish IP are redirected to `/pl/` using
`api.country.is`. Other countries remain on English. A language selected from
the visible EN/PL navigation is remembered and takes precedence. Both dedicated
URLs remain directly accessible and are listed in the sitemap for search engines.

## Continuous delivery (Docker Hub)

The GitHub Actions workflow
[`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml) handles the
image lifecycle:

- Only remote pushes that change `main` trigger the workflow.
- The image is pushed when both Docker Hub secrets are configured.

The separate
[`.github/workflows/seo-validation.yml`](.github/workflows/seo-validation.yml)
workflow runs the SEO validator after every push, regardless of branch.

### Required GitHub repository secrets

Configure these under **Settings → Secrets and variables → Actions**:

| Secret | Description |
| --- | --- |
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | A Docker Hub access token (not your password) |

Secrets are never stored in the repository or the workflow file.

### Published image

```
DOCKERHUB_USERNAME/rsds-infra-company-page
```

### Image tags

| Tag | Meaning |
| --- | --- |
| `latest` | Most recent build from `main` |
| `git-<commit-sha>` | Immutable tag for a specific commit |

## Deployment

This image is deployed to AWS EKS by the Helm chart in the companion repository
[`rsds-infra-helm`](https://github.com/renf7/rsds-infra-helm). That chart exposes the
site at https://rsdsoftware.eu and https://www.rsdsoftware.eu via an AWS Application
Load Balancer Ingress with an ACM certificate.

The preferred search URL is `https://www.rsdsoftware.eu/`. The deployment should
permanently redirect the apex domain to the `www` host so redirects, canonical URLs,
social metadata, and the sitemap all agree.

After deployment, add a Domain property for `rsdsoftware.eu` in Google Search
Console and Bing Webmaster Tools, verify it with DNS, submit
`https://www.rsdsoftware.eu/sitemap.xml`, and request indexing for `/` and `/pl/`.

Bing recommends IndexNow for faster update discovery. Add it only when an API key
and a post-deployment hook are available; an image build does not prove that the
new URLs are already live and should not submit them prematurely.


## Security runtime and deployment compatibility
The image runs nginx directly as UID/GID 101 on port 8080 and supports a read-only root filesystem with writable /tmp. Alpine security packages are upgraded during build, and Trivy must pass before publishing. Helm's default branch includes PR #4's hardened runtime (service.targetPort=8080); older charts targeting container port 80 are incompatible. Public Service/Ingress ports remain unchanged. CI checks English/Polish pages and CSS under the restricted runtime.

Semgrep exceptions are limited to canonical/hreflang metadata links: these do not load script/style subresources, so SRI does not apply. No executable-resource integrity rule is globally disabled. XML sitemap validation uses defusedxml to reject unsafe XML.

## Facebook Pages privacy policy
The English public document is served at /facebook-privacy-policy with the title Privacy Policy | RSD Software EU and linked from both home-page footers. It concerns the separate, currently unimplemented RSD Software EU Pages integration, not website SSO. See [policy facts, publication controls and release checks](docs/privacy/README.md). Run npm run privacy:verify before release, confirm the actual publication date and check the public HTTPS URL after deployment; a passing PR or local build does not prove production publication.
Account onboarding (1 November 2026): Continue with provider automatically creates or resolves one internal account by normalized verified email. No separate local registration/password. If provider email is missing/unverified, an accessible EN/PL one-time email-code form appears before JWT issuance. Verification codes and JWTs are never stored in browser storage. Apple relay addresses remain distinct; immutable provider bindings survive upstream email changes. The expanded local protocol suite has41 tests (16 marketing/25 auth), including actual SMTP delivery to a local-only sink. Real provider app registration is still required by the application owner for live login.

Authenticated users open Log out from the avatar with click/tap, right-click or keyboard (Enter/Space, Shift+F10). The same saved initials/colour remain visible from 320px upward. Escape returns focus; outside interaction dismisses the menu. A missing access cookie can recover once via the real refresh endpoint when the backend reports refresh-cookie presence; that hint never authenticates the user. Local full-stack fixture coverage is now 44 tests (16 marketing/28 auth).

Account Settings: the avatar menu opens /settings/ or /pl/settings/ as a complete page with sections and optional email, rather than a dialog. Missing provider email no longer blocks sign-in; provider-bound accounts retain stable subject/colour. Optional contact email is persisted through the authenticated, CSRF-protected settings API and is never proof for account linking. Unverified provider-supplied email retains ownership checks. The expanded local fixture-only suite covers 46 browser scenarios.

### Shared action feedback

Use `runAction(() => promise)` from `src/activity.ts` around user-triggered asynchronous operations. It tracks the entire promise, including response handling, clears in `finally` on success/failure, and keeps the shared indicator visible until overlapping actions finish. The root `ActivityIndicator` automatically tracks normal same-tab HTTP(S) link navigation (including every Continue with link), clears on page hide/restore, and renders inside an open native dialog so it remains visible above the modal. Logout explicitly starts navigation feedback before replacing the page. Settings save and provider availability requests use the same tracker. New asynchronous buttons must use this helper; instant menu toggles, same-page anchors, downloads, new tabs and external-app links do not invent a pending operation. Loading feedback is localized, announced as a status, and respects reduced motion. It cannot render on the external provider's own page after navigation completes.
