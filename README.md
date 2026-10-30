# rsds-infra-company-page

Static company website for **RSD Software** (rsdsoftware.eu), served by nginx.

RSD Software builds robust Java software with AI-powered support, delivered by experienced
software professionals. This repository contains the marketing landing page and the
Docker packaging used to ship it.

## What's in this repository

```
rsds-infra-company-page
├── public
│   ├── index.html       # English landing page
│   ├── pl/index.html    # Polish landing page
│   ├── robots.txt       # crawler rules and sitemap discovery
│   ├── sitemap.xml      # localized page discovery
│   ├── styles.css       # plain CSS, responsive, no build tools
│   └── logo.png         # organization and social-preview logo
├── scripts
│   └── validate-seo.py  # validates the search-facing contract
├── Dockerfile           # non-root nginx serving public/ on port 8080
└── .github/workflows
    ├── docker-build.yml   # builds and publishes main
    └── seo-validation.yml # validates every pushed branch
```

The site uses static HTML, CSS, and a small JavaScript language selector. There is
no application framework or frontend build step.

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
python -m pip install -r scripts/requirements.txt
python scripts/validate-seo.py
```

The same validation runs automatically after every push to any branch. It checks
language declarations and selection behavior, titles, descriptions, headings,
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
The image runs nginx directly as UID/GID 101 on port 8080 and supports a read-only root filesystem with writable /tmp. Alpine security packages are upgraded during build, and Trivy must pass before publishing. Deploy the companion rsds-infra-helm PR #4 configuration (service.targetPort=8080) before publishing/rolling out this image; older charts targeting port 80 are incompatible. The public Service/Ingress ports remain unchanged. CI checks English/Polish pages and CSS under the restricted runtime.

Semgrep exceptions are limited to canonical/hreflang metadata links: these do not load script/style subresources, so SRI does not apply. No executable-resource integrity rule is globally disabled. XML sitemap validation uses defusedxml to reject unsafe XML.
