#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/srv/web99/app"
ENV_FILE="/srv/web99/config/dashboard.env"
MARKER="SARAH-AWS-VERIFY-$(date +%s)"

echo "[sarah-reset] starting"

[[ -d "$APP_ROOT" ]] || { echo "[sarah-reset] FAIL: $APP_ROOT does not exist" >&2; exit 1; }
[[ -f "$APP_ROOT/start/index.html" ]] || { echo "[sarah-reset] FAIL: source start/index.html missing" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "[sarah-reset] FAIL: dashboard env missing at $ENV_FILE" >&2; exit 1; }

# Source of truth: Sarah uses the same web99.ie origin.
python3 - <<'PY'
from pathlib import Path
import re
p=Path('/srv/web99/app/start/index.html')
s=p.read_text()
new,n=re.subn(r'data-api="[^"]*"','data-api=""',s,count=1)
if n != 1:
    raise SystemExit('[sarah-reset] FAIL: could not find exactly one data-api attribute in source /start page')
p.write_text(new)
print('[sarah-reset] source /start now uses same-origin API')
PY

# Nginx serves /srv/web99/current. It is a symlink to a release. Resolve it
# instead of assuming /var/www/html or confusing it with /srv/web99/live.
NGINX_ROOT="$(sudo nginx -T 2>/dev/null | awk '
  /server_name[[:space:]]+web99\.ie([[:space:]]+www\.web99\.ie)?/ { in_web99=1 }
  in_web99 && $1=="root" { gsub(";", "", $2); print $2; exit }
')"
[[ -n "$NGINX_ROOT" ]] || { echo "[sarah-reset] FAIL: could not find web99.ie nginx root" >&2; exit 1; }

LIVE_ROOT="$(readlink -f "$NGINX_ROOT")"
[[ -d "$LIVE_ROOT" ]] || { echo "[sarah-reset] FAIL: nginx root does not resolve: $NGINX_ROOT" >&2; exit 1; }
LIVE_START="$LIVE_ROOT/start/index.html"
[[ -f "$LIVE_START" ]] || { echo "[sarah-reset] FAIL: live start page missing at $LIVE_START" >&2; exit 1; }

echo "[sarah-reset] nginx root: $NGINX_ROOT -> $LIVE_ROOT"

sudo python3 - "$LIVE_START" <<'PY'
from pathlib import Path
import re,sys
p=Path(sys.argv[1])
s=p.read_text()
new,n=re.subn(r'data-api="[^"]*"','data-api=""',s,count=1)
if n != 1:
    raise SystemExit('[sarah-reset] FAIL: could not find exactly one data-api attribute in live /start page')
p.write_text(new)
print('[sarah-reset] nginx-served /start now uses same-origin API')
PY

# Keep the separate /live tree consistent if present, but it is NOT treated as
# nginx's source of truth.
if [[ -f /srv/web99/live/start/index.html ]]; then
  sudo python3 - /srv/web99/live/start/index.html <<'PY'
from pathlib import Path
import re,sys
p=Path(sys.argv[1]); s=p.read_text()
new,n=re.subn(r'data-api="[^"]*"','data-api=""',s,count=1)
if n == 1: p.write_text(new)
PY
fi

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
printf '%s\n' "nginx root       -> $NGINX_ROOT -> $LIVE_ROOT"
printf '%s\n' "public /start    -> same-origin /api/chat"
printf '%s\n' "public API       -> responding"
printf '%s\n' "AWS order id     -> $ORDER_ID"
printf '%s\n' "PostgreSQL write -> verified in Control database"
printf '%s\n' "test marker      -> $MARKER"
printf '%s\n' "===================================================="
