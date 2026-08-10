#!/usr/bin/env bash
set -u

ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"

echo "=== WEB99 DOCTOR ==="
echo "time: $(date -Is)"
echo "host: $(hostname)"
echo "release: $(readlink -f /srv/web99/current 2>/dev/null || echo 'no current symlink')"
echo

echo "--- services ---"
for service in nginx postgresql web99-dashboard web99-worker; do
  printf '%-18s %s\n' "$service" "$(systemctl is-active "$service" 2>/dev/null || true)"
done

echo
echo "--- local health ---"
curl -sS --max-time 5 http://127.0.0.1:3000/control/api/health || true
echo

echo "--- public health ---"
curl -sS --max-time 10 https://web99.ie/api/health || true
echo

echo "--- disk ---"
df -h / /srv/web99 2>/dev/null | awk 'NR==1 || !seen[$1]++'
echo

echo "--- memory ---"
free -h || true

echo
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  echo "--- queue ---"
  psql "$DATABASE_URL" -P pager=off -c "
    SELECT status, count(*)
    FROM jobs
    GROUP BY status
    ORDER BY status;" 2>/dev/null || true
  echo
  echo "--- recent failed jobs ---"
  psql "$DATABASE_URL" -P pager=off -c "
    SELECT id, order_id, action, attempts, left(coalesce(error,''),120) AS error, finished_at
    FROM jobs
    WHERE status='failed'
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 5;" 2>/dev/null || true
fi

echo
echo "--- recent service errors ---"
journalctl -u web99-dashboard -u web99-worker --since '-30 min' -p warning --no-pager -n 30 2>/dev/null || true
