#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${WEB99_SOURCE_DIR:-/srv/web99/app}"
RELEASES_DIR="${WEB99_RELEASES_DIR:-/srv/web99/releases}"
CURRENT_LINK="${WEB99_CURRENT_LINK:-/srv/web99/current}"
ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"
BRANCH="${WEB99_BRANCH:-master-dashboard}"
KEEP_RELEASES="${WEB99_KEEP_RELEASES:-5}"
LOCK_FILE="${WEB99_DEPLOY_LOCK:-/var/lock/web99-deploy.lock}"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
[[ -d "$SOURCE_DIR/.git" ]] || die "missing Git checkout at $SOURCE_DIR"
[[ -f "$ENV_FILE" ]] || die "missing runtime env at $ENV_FILE"
command -v flock >/dev/null || die "flock is required"

mkdir -p "$RELEASES_DIR" "$(dirname "$CURRENT_LINK")" "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || die "another Web99 deploy is already running"

log "fetching origin/$BRANCH"
cd "$SOURCE_DIR"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"
SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:10}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE="$RELEASES_DIR/$STAMP-$SHORT"
PREVIOUS="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

log "building release $SHORT without touching live traffic"
mkdir -p "$RELEASE"
git archive "$SHA" | tar -x -C "$RELEASE"
chmod +x "$RELEASE"/ops/*.sh
ln -s "$ENV_FILE" "$RELEASE/dashboard/.env.local"

cd "$RELEASE/dashboard"
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build

# Install all machine configuration from the same tested release.
install -m 0644 "$RELEASE/ops/web99-dashboard.service" /etc/systemd/system/web99-dashboard.service
install -m 0644 "$RELEASE/ops/web99-worker.service" /etc/systemd/system/web99-worker.service
install -m 0644 "$RELEASE/ops/web99-backup.service" /etc/systemd/system/web99-backup.service
install -m 0644 "$RELEASE/ops/web99-backup.timer" /etc/systemd/system/web99-backup.timer
install -m 0644 "$RELEASE/ops/web99.nginx.conf" /etc/nginx/sites-available/web99
ln -sfn /etc/nginx/sites-available/web99 /etc/nginx/sites-enabled/web99

# Remove only the known superseded Web99 config. Other sites remain untouched.
rm -f /etc/nginx/sites-enabled/web99-main

nginx -t
systemctl daemon-reload

log "switching current release atomically"
ln -s "$RELEASE" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK"

rollback() {
  local reason="$1"
  log "new release failed: $reason"
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    log "rolling back to $PREVIOUS"
    ln -s "$PREVIOUS" "${CURRENT_LINK}.rollback"
    mv -Tf "${CURRENT_LINK}.rollback" "$CURRENT_LINK"
    systemctl restart web99-dashboard || true
    systemctl restart web99-worker || true
    nginx -t && systemctl reload nginx || true
  fi
  exit 1
}

systemctl enable web99-dashboard web99-worker web99-backup.timer >/dev/null
systemctl restart web99-dashboard
systemctl restart web99-worker
systemctl start web99-backup.timer
systemctl reload nginx

log "waiting for app"
for _ in $(seq 1 20); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/control/api/health | grep -q '"ok":true'; then
    break
  fi
  sleep 1
done

"$CURRENT_LINK/ops/smoke.sh" || rollback "smoke tests"

# Keep a few complete rollback points; never delete the current target.
CURRENT_REAL="$(readlink -f "$CURRENT_LINK")"
mapfile -t OLD_RELEASES < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
COUNT=0
for dir in "${OLD_RELEASES[@]}"; do
  ((COUNT+=1))
  if (( COUNT > KEEP_RELEASES )) && [[ "$dir" != "$CURRENT_REAL" ]]; then
    rm -rf -- "$dir"
  fi
done

log "LIVE $SHA"
log "dashboard: https://web99.ie/control"
log "health:    https://web99.ie/api/health"
