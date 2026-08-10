#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${WEB99_SOURCE_DIR:-/srv/web99/app}"
LIVE_DIR="${WEB99_LIVE_DIR:-/srv/web99/live}"
ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"
BRANCH="${WEB99_BRANCH:-master-dashboard}"
LOCK_FILE="${WEB99_DEPLOY_LOCK:-/var/lock/web99-deploy.lock}"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
[[ -d "$SOURCE_DIR/.git" ]] || die "missing Git checkout at $SOURCE_DIR"
[[ -f "$ENV_FILE" ]] || die "missing runtime env at $ENV_FILE"
for cmd in flock git tar node npm nginx systemctl curl psql visudo pg_dump pg_restore; do
  command -v "$cmd" >/dev/null 2>&1 || die "required command missing: $cmd"
done

mkdir -p "$(dirname "$LOCK_FILE")" /srv/web99/backups
exec 9>"$LOCK_FILE"
flock -n 9 || die "another Web99 deploy is already running"

install_machine_config() {
  local tree="$1"
  install -m 0644 "$tree/ops/web99-dashboard.service" /etc/systemd/system/web99-dashboard.service
  install -m 0644 "$tree/ops/web99-worker.service" /etc/systemd/system/web99-worker.service
  install -m 0644 "$tree/ops/web99-backup.service" /etc/systemd/system/web99-backup.service
  install -m 0644 "$tree/ops/web99-backup.timer" /etc/systemd/system/web99-backup.timer
  install -m 0644 "$tree/ops/web99.nginx.conf" /etc/nginx/sites-available/web99
  ln -sfn /etc/nginx/sites-available/web99 /etc/nginx/sites-enabled/web99
  rm -f /etc/nginx/sites-enabled/web99-main /etc/nginx/sites-enabled/web99-dashboard

  install -d -m 0755 /usr/local/libexec
  install -o root -g root -m 0755 "$tree/ops/web99-ops-tool" /usr/local/libexec/web99-ops-tool
  cat >/etc/sudoers.d/web99-ops-agent <<'EOF'
# Web99 private Ops Agent: only the allowlisted helper may run as root.
ubuntu ALL=(root) NOPASSWD: /usr/local/libexec/web99-ops-tool *
EOF
  chmod 0440 /etc/sudoers.d/web99-ops-agent
  visudo -cf /etc/sudoers.d/web99-ops-agent >/dev/null

  systemctl daemon-reload
  nginx -t
}

rollback() {
  local reason="$1"
  log "FAILED: $reason"

  if [[ -d "${LIVE_DIR}.prev" ]]; then
    log "restoring previous live directory"
    rm -rf "${LIVE_DIR}.failed"
    if [[ -d "$LIVE_DIR" ]]; then mv "$LIVE_DIR" "${LIVE_DIR}.failed"; fi
    mv "${LIVE_DIR}.prev" "$LIVE_DIR"
    install_machine_config "$LIVE_DIR" || true
    systemctl restart web99-dashboard || true
    systemctl restart web99-worker || true
    nginx -t && systemctl reload nginx || true
  fi
  exit 1
}

log "fetching origin/$BRANCH"
cd "$SOURCE_DIR"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"
SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:10}"

# Build only in the source checkout. Production keeps running from /srv/web99/live
# until every build/test/database step has succeeded.
rm -f "$SOURCE_DIR/dashboard/.env.local"
ln -s "$ENV_FILE" "$SOURCE_DIR/dashboard/.env.local"

log "building $SHORT while live traffic keeps using the current copy"
cd "$SOURCE_DIR/dashboard"
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build

DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
[[ -n "$DATABASE_URL" ]] || die "DATABASE_URL is missing from $ENV_FILE"
DATABASE_URL="$DATABASE_URL" npm run db:init

log "creating verified database backup"
WEB99_ENV_FILE="$ENV_FILE" WEB99_BACKUP_DIR=/srv/web99/backups \
  bash "$SOURCE_DIR/ops/backup.sh"

# Prepare one complete replacement tree. No release symlinks and no split live roots.
log "preparing one live tree"
rm -rf "${LIVE_DIR}.new"
mkdir -p "${LIVE_DIR}.new"
cd "$SOURCE_DIR"
tar --exclude='./.git' -cf - . | tar -xf - -C "${LIVE_DIR}.new"
chown -R ubuntu:ubuntu "${LIVE_DIR}.new"

# Keep exactly one previous copy for immediate rollback. Directory rename on the
# same filesystem is atomic; old Node processes keep running until restarted.
rm -rf "${LIVE_DIR}.prev"
if [[ -d "$LIVE_DIR" ]]; then mv "$LIVE_DIR" "${LIVE_DIR}.prev"; fi
mv "${LIVE_DIR}.new" "$LIVE_DIR"

install_machine_config "$LIVE_DIR" || rollback "machine configuration validation"

systemctl enable web99-dashboard web99-worker web99-backup.timer >/dev/null
systemctl restart web99-dashboard || rollback "dashboard restart"
systemctl restart web99-worker || rollback "worker restart"
systemctl start web99-backup.timer || rollback "backup timer"
systemctl reload nginx || rollback "nginx reload"

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

"$LIVE_DIR/ops/smoke.sh" || rollback "production smoke tests"

rm -rf "${LIVE_DIR}.failed"
log "LIVE $SHA"
log "runtime:   $LIVE_DIR"
log "dashboard: https://web99.ie/control"
log "ops:       https://web99.ie/ops-console/"
log "future deploys: web99-deploy"
