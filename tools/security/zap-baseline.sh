#!/usr/bin/env bash
set -euo pipefail
# No target parameter: this scanner must never be redirected to a live site.
network="rsds-zap-${GITHUB_RUN_ID:-local}-$$"
site="$network-site"
scanner="$network-scanner"
image="rsds-zap:${GITHUB_SHA:-local}"
report="$(pwd)/.validation/zap"
cleanup() {
  docker rm -f "$scanner" "$site" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
mkdir -p "$report"
# Isolated non-secret scan artifacts must be writable by the image's zap user.
chmod 777 "$report"
docker build -t "$image" .
docker network create --internal "$network"
docker run -d --name "$site" --network "$network" --network-alias site \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m,mode=1777 "$image"
docker run --name "$scanner" --network "$network" \
  --mount "type=bind,source=$report,target=/zap/wrk" \
  ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af \
  zap-baseline.py -t http://site:8080 -m 1 -T 3 \
  -r report.html -J report.json -z '-config autoupdate.checkOnStart=false'
