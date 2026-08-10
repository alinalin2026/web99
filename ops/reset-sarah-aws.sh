#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/srv/web99/app"
ENV_FILE="/srv/web99/config/dashboard.env"
LIVE_ROOT="/srv/web99/current"
MARKER="SARAH-AWS-VERIFY-$(date +%s)"

echo "[sarah-reset] starting"

[[ -d "$APP_ROOT" ]] || { echo "[sarah-reset] FAIL: $APP_ROOT does not exist" >&2; exit 1; }
[[ -f "$APP_ROOT/start/index.html" ]] || { echo "[sarah-reset] FAIL: source start/index.html missing" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "[sarah-reset] FAIL: dashboard env missing at $ENV_FILE" >&2; exit 1; }
[[ -f "$LIVE_ROOT/start/index.html" ]] || { echo "[sarah-reset] FAIL: live start page missing at $LIVE_ROOT/start/index.html" >&2; exit 1; }

python3 - <<'PY'
from pathlib import Path
import re
for raw in ['/srv/web99/app/start/index.html','/srv/web99/current/start/index.html','/srv/web99/live/start/index.html']:
    p=Path(raw)
    if not p.exists():
        continue
    s=p.read_text()
    new,n=re.subn(r'data-api="[^"]*"','data-api=""',s,count=1)
    if n != 1:
        raise SystemExit(f'[sarah-reset] FAIL: expected one data-api attribute in {raw}, found {n}')
    p.write_text(new)
    print(f'[sarah-reset] same-origin API set in {raw}')
PY

PUBLIC_HTML="$(curl -fsS --max-time 15 https://web99.ie/start/)"
PUBLIC_API_ATTR="$(printf '%s' "$PUBLIC_HTML" | grep -o 'data-api="[^"]*"' | head -1 || true)"
echo "[sarah-reset] public attribute: ${PUBLIC_API_ATTR:-MISSING}"
[[ "$PUBLIC_API_ATTR" == 'data-api=""' ]] || { echo "[sarah-reset] FAIL: public /start is still not same-origin" >&2; exit 1; }

if printf '%s' "$PUBLIC_HTML" | grep -qi 'web99dashboard\.vercel\.app'; then
  echo "[sarah-reset] FAIL: public /start still contains old Vercel dashboard reference" >&2
  exit 1
fi

HEALTH="$(curl -fsS --max-time 15 https://web99.ie/api/health)"
echo "[sarah-reset] health: $HEALTH"

CHAT_RESPONSE="$(curl -fsS --max-time 75 -H 'Content-Type: application/json' -d "{\"message\":\"$MARKER\"}" https://web99.ie/api/chat)"
echo "[sarah-reset] chat response: $CHAT_RESPONSE"
ORDER_ID="$(printf '%s' "$CHAT_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("orderId") or "")')"
[[ -n "$ORDER_ID" ]] || { echo "[sarah-reset] FAIL: /api/chat returned no orderId" >&2; exit 1; }

DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
[[ -n "$DATABASE_URL" ]] || { echo "[sarah-reset] FAIL: DATABASE_URL is empty" >&2; exit 1; }
FOUND="$(psql "$DATABASE_URL" -Atc "SELECT count(*) FROM orders WHERE id='${ORDER_ID}' AND conversation::text LIKE '%${MARKER}%';")"
[[ "$FOUND" == "1" ]] || { echo "[sarah-reset] FAIL: browser-path test order was not found in Control database" >&2; exit 1; }

echo
printf '%s\n' "================ SARAH AWS RESET OK ================"
printf '%s\n' "live root         -> $LIVE_ROOT"
printf '%s\n' "public /start     -> same-origin /api/chat"
printf '%s\n' "public API        -> responding"
printf '%s\n' "AWS order id      -> $ORDER_ID"
printf '%s\n' "PostgreSQL write  -> verified in Control database"
printf '%s\n' "test marker       -> $MARKER"
printf '%s\n' "===================================================="
