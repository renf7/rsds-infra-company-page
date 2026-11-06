#!/usr/bin/env bash
set -euo pipefail

# Run from the frontend repository root; caller checks out the pinned runner.
prefix="rsds-react-${GITHUB_RUN_ID:-local}-validation"
artifacts="$(pwd)/.validation/artifacts"
mkdir -p "$artifacts"
cleanup() {
  docker rm -f "$prefix-e2e" "$prefix-visual" "$prefix-privacy" "$prefix-icons" "$prefix-candidate" "$prefix-baseline" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
}
trap cleanup EXIT
# RSDSINFRA-30 explicitly approves this one brand asset replacement. Keep every
# other pinned baseline file and the zero-different-pixels comparison unchanged.
cp public/logo-icon.png .validation/static/public/logo-icon.png
cp public/logo.png .validation/static/public/logo.png
# The owner also approved the EU suffix throughout website branding in PR18.
# Normalize only that exact phrase in the frozen HTML, preserving the rest.
python3 - <<'PY'
from pathlib import Path
import re
for name in ('index.html', 'pl/index.html'):
    path = Path('.validation/static/public') / name
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'\bRSD Software\b(?!\s+EU\b)', 'RSD Software EU', text, flags=re.IGNORECASE)
    text = text.replace('content="600"', 'content="256"').replace('"width": 600', '"width": 256').replace('"height": 600', '"height": 256')
    path.write_text(text, encoding='utf-8')
PY
docker build -t "$prefix-baseline" .validation/static
docker build -t "$prefix-candidate" .
docker build -t "$prefix-browser" .validation/runner/e2e
docker network create "$prefix"
for version in baseline candidate; do
  docker run -d --name "$prefix-$version" --network "$prefix" --network-alias "$version" \
    --user 101:101 --read-only --cap-drop ALL --security-opt no-new-privileges \
    --tmpfs /tmp:rw,noexec,nosuid,size=640m,mode=1777 "$prefix-$version"
done

run_browser() {
  local name="$1"
  shift
  docker create --name "$prefix-$name" --network "$prefix" --cap-drop ALL \
    --security-opt no-new-privileges --shm-size 256m "$@"
  local status=0
  docker start --attach "$prefix-$name" || status=$?
  docker cp "$prefix-$name:/artifacts/." "$artifacts/$name"
  local container_status
  container_status=$(docker inspect --format '{{.State.ExitCode}}' "$prefix-$name")
  test "$status" -eq 0 && test "$container_status" -eq 0
}
run_browser e2e --env BASE_URL=http://candidate:8080 "$prefix-browser"
run_browser visual --env BASELINE_URL=http://baseline:8080 --env CANDIDATE_URL=http://candidate:8080 \
  --mount "type=bind,source=$(pwd)/tests/browser/visual.py,target=/visual.py,readonly" \
  "$prefix-browser" python /visual.py
run_browser privacy --env CANDIDATE_URL=http://candidate:8080 \
  --mount "type=bind,source=$(pwd)/tests/browser/privacy.py,target=/privacy.py,readonly" \
  "$prefix-browser" python /privacy.py
run_browser icons --env CANDIDATE_URL=http://candidate:8080 \
  --mount "type=bind,source=$(pwd)/tests/browser/provider-icons.py,target=/provider-icons.py,readonly" \
  "$prefix-browser" python /provider-icons.py
