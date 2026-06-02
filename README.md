# rsds-infra-company-page

Static company website for **RSDS** (rsdsoftware.eu), served by nginx.

RSDS builds robust Java software with AI-powered support, delivered by experienced
software professionals. This repository contains the marketing landing page and the
Docker packaging used to ship it.

## What's in this repository

```
rsds-infra-company-page
├── public
│   ├── index.html      # the landing page (semantic HTML, SEO meta tags)
│   ├── styles.css      # plain CSS, responsive, no build tools
│   └── logo.svg        # simple inline SVG logo
├── Dockerfile          # nginx:alpine serving public/ on port 80
├── .dockerignore
├── README.md
└── .github
    └── workflows
        └── docker-build.yml   # builds & pushes the image to Docker Hub
```

The site is static HTML/CSS only — no React/Vue/Angular/Next.js, no build step,
and no external JavaScript.

## Build the image locally

```bash
docker build -t rsds-infra-company-page .
```

## Run the image locally

```bash
docker run --rm -p 8080:80 rsds-infra-company-page
```

Then open:

```
http://localhost:8080
```

## Continuous delivery (Docker Hub)

On every push to `main`, the GitHub Actions workflow
[`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml) builds the
image and pushes it to Docker Hub.

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
