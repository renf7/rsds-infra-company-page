# React migration plan

Tracking issue: https://rsdsoftware.atlassian.net/browse/RSDSINFRA-5

Implementation: React 19.3.1 + TypeScript + Vite 8.3.5 in PR #8. Rebased onto the default branch security baseline. Theme, login and backend additions remain separate tasks. Overall acceptance includes RSDSINFRA-12 (visual baseline) and RSDSINFRA-13 (build/runtime compatibility).

## Existing production contract

- English website: https://www.rsdsoftware.eu/
- Polish website: https://www.rsdsoftware.eu/pl/
- Preserve current content, responsive design, navigation, certificates, branding, assets, and contact links.
- Preserve explicit language selection, its remembered preference, and the existing first-visit country-based language behavior.
- Preserve canonical URLs, reciprocal hreflang links, localized metadata, structured data, robots.txt, and sitemap.xml.
- The companion Helm chart consumes renf7/rsds-infra-company-page and expects HTTP on container port 8080, exposed through Service port 80, including a successful GET / for health checks.
- Existing image publication uses latest and git-<commit-sha> tags.

## Implementation steps

1. Introduce React, a frontend build tool, a dependency lockfile, and local development/build scripts.
2. Extract reusable header, navigation, section, feature-card, contact, and footer components. Keep localized content separate from layout.
3. Render both language entry points through React. Prefer build-time rendering plus hydration to retain the existing indexable HTML and metadata on first response.
4. Preserve / and /pl/ direct navigation, refresh behavior, language preference, assets, and section anchors.
5. Use a multi-stage Dockerfile: install locked dependencies and build in a Node stage, then copy generated assets into nginx. Keep the runtime port, image repository, and publication tags compatible with Helm.
6. Adapt scripts/validate-seo.py and its workflow to validate the generated output while retaining current SEO checks. Add build verification to pull requests.
7. Update README instructions for installation, development, production build, SEO validation, and Docker usage.

## Verification before marking implementation ready

TDD sequence on 30 October 2026: froze EN/PL HTML from pre-migration default commit `d8eabc402529f57a245134007c362e456d1f0042`; rendered an empty App and confirmed four failing DOM/content/accessibility assertions. Implemented reusable components against those contracts. Added language tests before implementation (12 failures, four already passing), then implemented storage/network/timeout fallbacks. Added hydration/pre-render failure tests. The resulting 25 unit tests passed with 98.24% line coverage. RED/GREEN logs were retained locally; CI regenerates final tests/coverage rather than relying on historical logs.

Frozen fixtures live in `tests/fixtures/static/`; never regenerate them from React output. The visual baseline is built from the immutable Git commit. Original CSS and image assets remain unchanged. Four local full-page comparisons (desktop 1440×1000 and mobile 390×844, both languages) reported zero differing pixels. `tests/browser/visual.py` also checks four direct/refresh routes with JavaScript disabled. The browser suite is the pinned 16-scenario suite from `rsds-infra-local`, preserving its behavior contracts.

CI `.github/workflows/react.yml` checks out the reviewed runner and static baseline, runs unit/coverage/build checks, then invokes `bash tests/browser/check.sh`. This builds both nginx images and the browser image, uses a private Docker network, preserves artifacts and cleans only its own containers/network. Existing free security scanners, SEO and typed Hooks/accessibility lint remain enabled on every PR update. Sonar consumes React LCOV coverage and waits for its gate. PR jobs do not publish or deploy.

- Run reproducible dependency installation and the production build.
- Run the existing SEO validator against generated English and Polish HTML.
- Check visible content and responsive layout for both languages.
- Check language switching, remembered preference, country lookup fallback, navigation anchors, and contact links.
- Build and run the production Docker image; verify HTTP 200 for / and /pl/, expected metadata, and loading of generated assets.
- Confirm CI passes and the Docker publishing workflow retains its main-branch release behavior.

## Release

Review and merge the implementation separately. Deploy the resulting commit-tagged image through the existing Helm release process and smoke-test both production language URLs. Retain the previous image tag for rollback.
