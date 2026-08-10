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
for cmd in flock git tar node npm nginx systemctl curl psql; do
  command -v "$cmd" >/dev/null 2>&1 || die "required command missing: $cmd"
done

mkdir -p "$RELEASES_DIR" "$(dirname "$CURRENT_LINK")" "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || die "another Web99 deploy is already running"

install_machine_config() {
  local release="$1"
  [[ -d "$release/ops" ]] || return 1
  install -m 0644 "$release/ops/web99-dashboard.service" /etc/systemd/system/web99-dashboard.service
  install -m 0644 "$release/ops/web99-worker.service" /etc/systemd/system/web99-worker.service
  install -m 0644 "$release/ops/web99-backup.service" /etc/systemd/system/web99-backup.service
  install -m 0644 "$release/ops/web99-backup.timer" /etc/systemd/system/web99-backup.timer
  install -m 0644 "$release/ops/web99.nginx.conf" /etc/nginx/sites-available/web99
  ln -sfn /etc/nginx/sites-available/web99 /etc/nginx/sites-enabled/web99
  rm -f /etc/nginx/sites-enabled/web99-main /etc/nginx/sites-enabled/web99-dashboard
  systemctl daemon-reload
  nginx -t
}

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

# Read only DATABASE_URL with Node's env-file parser. Do not `source` a secrets
# file in bash: values such as spaces, angle brackets or # characters are valid
# env values but are not necessarily valid shell syntax.
DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
[[ -n "$DATABASE_URL" ]] || die "DATABASE_URL is missing from $ENV_FILE"
DATABASE_URL="$DATABASE_URL" npm run db:init

# Validate machine config before switching the live symlink.
install_machine_config "$RELEASE"

log "switching current release atomically"
rm -f "${CURRENT_LINK}.new"
ln -s "$RELEASE" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK"

rollback() {
  local reason="$1"
  log "new release failed: $reason"
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    log "rolling back to $PREVIOUS"
    rm -f "${CURRENT_LINK}.rollback"
    ln -s "$PREVIOUS" "${CURRENT_LINK}.rollback"
    mv -Tf "${CURRENT_LINK}.rollback" "$CURRENT_LINK"
    install_machine_config "$PREVIOUS" || true
    systemctl restart web99-dashboard || true
    systemctl restart web99-worker || true
    nginx -t && systemctl reload nginx || true
  else
    log "no previous atomic release exists; leaving failed release files for diagnosis"
  fi
  exit 1
}

systemctl enable web99-dashboard web99-worker web99-backup.timer >/dev/null
systemctl restart web99-dashboard || rollback "dashboard service would not restart"
systemctl restart web99-worker || rollback "worker service would not restart"
systemctl start web99-backup.timer || rollback "backup timer would not start"
systemctl reload nginx || rollback "nginx would not reload"

log "waiting for app + database"
READY=0
for _ in $(seq 1 25); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/control/api/health | grep -q '"ok":true'; then
    READY=1
    break
  fi
  sleep 1
done
[[ "$READY" == "1" ]] || rollback "app did not become healthy"

"$CURRENT_LINK/ops/smoke.sh" || rollback "production smoke tests"

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
log "future deploys: sudo web99-deploy"
