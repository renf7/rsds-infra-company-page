# React migration plan

Tracking issue: https://github.com/renf7/rsds-infra-company-page/issues/7

Status: planning only. The React implementation and its verification are pending.

## Existing production contract

- English website: https://www.rsdsoftware.eu/
- Polish website: https://www.rsdsoftware.eu/pl/
- Preserve current content, responsive design, navigation, certificates, branding, assets, and contact links.
- Preserve explicit language selection, its remembered preference, and the existing first-visit country-based language behavior.
- Preserve canonical URLs, reciprocal hreflang links, localized metadata, structured data, robots.txt, and sitemap.xml.
- The companion Helm chart consumes renf7/rsds-infra-company-page and expects HTTP on port 80, including a successful GET / for health checks.
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

- Run reproducible dependency installation and the production build.
- Run the existing SEO validator against generated English and Polish HTML.
- Check visible content and responsive layout for both languages.
- Check language switching, remembered preference, country lookup fallback, navigation anchors, and contact links.
- Build and run the production Docker image; verify HTTP 200 for / and /pl/, expected metadata, and loading of generated assets.
- Confirm CI passes and the Docker publishing workflow retains its main-branch release behavior.

## Release

Review and merge the implementation separately. Deploy the resulting commit-tagged image through the existing Helm release process and smoke-test both production language URLs. Retain the previous image tag for rollback.
