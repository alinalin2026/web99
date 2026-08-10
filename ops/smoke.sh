#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${WEB99_BASE_URL:-https://web99.ie}"
ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"

fail() { echo "[smoke] FAIL: $*" >&2; exit 1; }
pass() { echo "[smoke] OK: $*"; }

LOCAL_HEALTH="$(curl -fsS --max-time 10 http://127.0.0.1:3000/control/api/health)" || fail "local health endpoint"
echo "$LOCAL_HEALTH" | grep -q '"ok":true' || fail "local health says not ok"
echo "$LOCAL_HEALTH" | grep -q '"database":"ok"' || fail "database health"
echo "$LOCAL_HEALTH" | grep -q '"openaiConfigured":true' || fail "OpenAI key is not configured"
pass "Next app + PostgreSQL + OpenAI configuration"

PUBLIC_HEALTH="$(curl -fsS --max-time 15 "$BASE_URL/api/health")" || fail "public health endpoint"
echo "$PUBLIC_HEALTH" | grep -q '"ok":true' || fail "public health says not ok"
pass "public API routing"

START_HTML="$(curl -fsS --max-time 15 -H 'Cache-Control: no-cache' "$BASE_URL/start/?smoke=$(date +%s)")" || fail "/start"
echo "$START_HTML" | grep -q 'Tell us about your business' || fail "/start returned wrong page"
echo "$START_HTML" | grep -q 'Sarah' || fail "Sarah intake missing"

# Do not couple production health to an asset filename. During the migration
# both sarah.svg and the legacy sarah-photo.svg name may point at the same new
# vector avatar. Verify the asset the page actually references and its content.
if echo "$START_HTML" | grep -q 'sarah.svg'; then
  AVATAR_PATH="/assets/img/sarah.svg"
elif echo "$START_HTML" | grep -q 'sarah-photo.svg'; then
  AVATAR_PATH="/assets/img/sarah-photo.svg"
else
  fail "Sarah avatar is not referenced"
fi

SARAH_ASSET="$(curl -fsS --max-time 10 -H 'Cache-Control: no-cache' "$BASE_URL$AVATAR_PATH?smoke=$(date +%s)")" || fail "Sarah avatar asset"
echo "$SARAH_ASSET" | grep -qi '<svg' || fail "Sarah avatar did not return SVG"
echo "$SARAH_ASSET" | grep -q 'Sarah, the Web99 assistant' || fail "unexpected Sarah avatar asset"
pass "Sarah intake + vector avatar ($AVATAR_PATH)"

CONTROL_CODE="$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$BASE_URL/control")"
case "$CONTROL_CODE" in
  200|301|302|303|307|308) pass "operator control route ($CONTROL_CODE)" ;;
  *) fail "operator control route returned $CONTROL_CODE" ;;
esac

# Prove the public /api alias reaches the chat route without spending OpenAI
# money. A GET should be rejected by the route/method, but must not be a 404.
CHAT_CODE="$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$BASE_URL/api/chat")"
case "$CHAT_CODE" in
  200|400|401|405) pass "Sarah API route exists ($CHAT_CODE)" ;;
  *) fail "Sarah API route returned unexpected $CHAT_CODE" ;;
esac

# The release contains source code, but Nginx must never serve the dashboard
# source tree as static files.
SOURCE_CODE="$(curl -sS -o /dev/null --max-time 10 -w '%{http_code}' "$BASE_URL/dashboard/package.json")"
[[ "$SOURCE_CODE" == "404" || "$SOURCE_CODE" == "403" ]] || fail "dashboard source is publicly reachable ($SOURCE_CODE)"
pass "source tree is not public"

if [[ -f "$ENV_FILE" ]] && command -v node >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
  DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
  if [[ -n "$DATABASE_URL" ]]; then
    SLUG="$(psql "$DATABASE_URL" -Atqc "SELECT slug FROM orders WHERE generated IS NOT NULL AND slug IS NOT NULL ORDER BY updated_at DESC LIMIT 1" 2>/dev/null || true)"
    if [[ -n "$SLUG" ]]; then
      DEMO_CODE="$(curl -sS -o /dev/null --max-time 20 -w '%{http_code}' "$BASE_URL/demo/$SLUG")"
      [[ "$DEMO_CODE" == "200" ]] || fail "customer demo $SLUG returned $DEMO_CODE"
      pass "customer demo ($SLUG)"
    else
      echo "[smoke] SKIP: no generated demo exists yet"
    fi
  fi
fi

pass "all production smoke tests"
