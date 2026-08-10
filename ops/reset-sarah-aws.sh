#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/srv/web99/app"
ENV_FILE="/srv/web99/config/dashboard.env"
MARKER="SARAH-AWS-VERIFY-$(date +%s)"

echo "[sarah-reset] starting"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "[sarah-reset] FAIL: $APP_ROOT does not exist" >&2
  exit 1
fi

if [[ ! -f "$APP_ROOT/start/index.html" ]]; then
  echo "[sarah-reset] FAIL: source start/index.html missing" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[sarah-reset] FAIL: dashboard env missing at $ENV_FILE" >&2
  exit 1
fi

# 1) Source of truth: Sarah must use same-origin /api/chat.
# The browser JS builds `${api}/api/chat`; an empty data-api therefore means
# https://web99.ie/api/chat on production. This deliberately removes any old
# Vercel/AWS-IP endpoint that can split chat writes from Control's database.
python3 - <<'PY'
from pathlib import Path
import re
p = Path('/srv/web99/app/start/index.html')
s = p.read_text()
new, n = re.subn(r'data-api="[^"]*"', 'data-api=""', s, count=1)
if n != 1:
    raise SystemExit('[sarah-reset] FAIL: could not find exactly one data-api attribute in source /start page')
p.write_text(new)
print('[sarah-reset] source /start now uses same-origin API')
PY

# 2) Find the actual static root serving web99.ie and update only its /start copy.
LIVE_ROOT="$(sudo nginx -T 2>/dev/null | awk '
  /server_name[[:space:]]+web99\.ie([[:space:]]+www\.web99\.ie)?/ { in_web99=1 }
  in_web99 && $1=="root" { gsub(";", "", $2); print $2; exit }
')"

if [[ -z "$LIVE_ROOT" || ! -d "$LIVE_ROOT" ]]; then
  echo "[sarah-reset] FAIL: could not resolve live nginx static root" >&2
  exit 1
fi

if [[ ! -f "$LIVE_ROOT/start/index.html" ]]; then
  echo "[sarah-reset] FAIL: live start page missing at $LIVE_ROOT/start/index.html" >&2
  exit 1
fi

echo "[sarah-reset] live static root: $LIVE_ROOT"

sudo python3 - "$LIVE_ROOT/start/index.html" <<'PY'
from pathlib import Path
import re, sys
p = Path(sys.argv[1])
s = p.read_text()
new, n = re.subn(r'data-api="[^"]*"', 'data-api=""', s, count=1)
if n != 1:
    raise SystemExit('[sarah-reset] FAIL: could not find exactly one data-api attribute in live /start page')
p.write_text(new)
print('[sarah-reset] live /start now uses same-origin API')
PY

# 3) Prove the PUBLIC HTML customers receive has no external Sarah backend.
PUBLIC_API_ATTR="$(curl -fsS --max-time 15 https://web99.ie/start/ | grep -o 'data-api="[^"]*"' | head -1 || true)"
echo "[sarah-reset] public attribute: ${PUBLIC_API_ATTR:-MISSING}"

if [[ "$PUBLIC_API_ATTR" != 'data-api=""' ]]; then
  echo "[sarah-reset] FAIL: public /start is still not same-origin" >&2
  exit 1
fi

if curl -fsS --max-time 15 https://web99.ie/start/ | grep -qi 'web99dashboard\.vercel\.app'; then
  echo "[sarah-reset] FAIL: public /start still contains old Vercel dashboard reference" >&2
  exit 1
fi

# 4) Prove the public AWS API is alive.
HEALTH="$(curl -fsS --max-time 15 https://web99.ie/api/health)"
echo "[sarah-reset] health: $HEALTH"

# 5) Send a real chat through the SAME URL the browser now uses.
CHAT_RESPONSE="$(curl -fsS --max-time 75 \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"$MARKER\"}" \
  https://web99.ie/api/chat)"

echo "[sarah-reset] chat response: $CHAT_RESPONSE"

ORDER_ID="$(printf '%s' "$CHAT_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("orderId") or "")')"
if [[ -z "$ORDER_ID" ]]; then
  echo "[sarah-reset] FAIL: /api/chat returned no orderId" >&2
  exit 1
fi

# 6) Query the exact database configured for the AWS dashboard service.
DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
if [[ -z "$DATABASE_URL" ]]; then
  echo "[sarah-reset] FAIL: DATABASE_URL is empty" >&2
  exit 1
fi

FOUND="$(psql "$DATABASE_URL" -Atc "SELECT count(*) FROM orders WHERE id='${ORDER_ID}' AND conversation::text LIKE '%${MARKER}%';")"
if [[ "$FOUND" != "1" ]]; then
  echo "[sarah-reset] FAIL: browser-path test order was not found in Control database" >&2
  exit 1
fi

echo
printf '%s\n' "================ SARAH AWS RESET OK ================"
printf '%s\n' "public /start    -> same-origin /api/chat"
printf '%s\n' "public API       -> responding"
printf '%s\n' "AWS order id     -> $ORDER_ID"
printf '%s\n' "PostgreSQL write -> verified in Control database"
printf '%s\n' "test marker      -> $MARKER"
printf '%s\n' "===================================================="
