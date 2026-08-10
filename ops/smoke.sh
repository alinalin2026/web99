#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${WEB99_BASE_URL:-https://web99.ie}"
ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"

fail() { echo "[smoke] FAIL: $*" >&2; exit 1; }
pass() { echo "[smoke] OK: $*"; }

# Next + database from inside the box.
LOCAL_HEALTH="$(curl -fsS --max-time 10 http://127.0.0.1:3000/control/api/health)" || fail "local health endpoint"
echo "$LOCAL_HEALTH" | grep -q '"ok":true' || fail "local health says not ok"
pass "Next app + PostgreSQL"

# Public front door.
PUBLIC_HEALTH="$(curl -fsS --max-time 15 "$BASE_URL/api/health")" || fail "public health endpoint"
echo "$PUBLIC_HEALTH" | grep -q '"ok":true' || fail "public health says not ok"
pass "public API routing"

START_HTML="$(curl -fsS --max-time 15 "$BASE_URL/start/")" || fail "/start"
echo "$START_HTML" | grep -q 'Tell us about your business' || fail "/start returned wrong page"
echo "$START_HTML" | grep -q 'Sarah' || fail "Sarah intake missing"
pass "Sarah intake"

CONTROL_CODE="$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$BASE_URL/control")"
case "$CONTROL_CODE" in
  200|301|302|303|307|308) pass "operator control route ($CONTROL_CODE)" ;;
  *) fail "operator control route returned $CONTROL_CODE" ;;
esac

# If at least one generated site exists, prove customer previews work too.
if [[ -f "$ENV_FILE" ]] && command -v psql >/dev/null 2>&1; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [[ -n "${DATABASE_URL:-}" ]]; then
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
