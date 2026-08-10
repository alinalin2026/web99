#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${WEB99_SOURCE_DIR:-/srv/web99/app}"
CONFIG_DIR="${WEB99_CONFIG_DIR:-/srv/web99/config}"
ENV_FILE="$CONFIG_DIR/dashboard.env"

log() { printf '[install] %s\n' "$*"; }
die() { printf '[install] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
[[ -d "$SOURCE_DIR/.git" ]] || die "missing Git checkout at $SOURCE_DIR"

for cmd in git node npm nginx psql pg_dump pg_restore curl flock; do
  command -v "$cmd" >/dev/null 2>&1 || die "required command missing: $cmd"
done

[[ -f /etc/letsencrypt/live/web99.ie/fullchain.pem ]] || die "web99.ie certificate not found"

mkdir -p "$CONFIG_DIR" /srv/web99/backups
chown -R ubuntu:ubuntu "$CONFIG_DIR" /srv/web99/backups
chmod 700 "$CONFIG_DIR" /srv/web99/backups

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$SOURCE_DIR/dashboard/.env.local" ]]; then
    log "migrating existing dashboard secrets to persistent config"
    cp -L "$SOURCE_DIR/dashboard/.env.local" "$ENV_FILE"
  else
    die "no $ENV_FILE and no existing dashboard/.env.local to migrate"
  fi
fi

if grep -q '^APP_URL=' "$ENV_FILE"; then
  sed -i 's#^APP_URL=.*#APP_URL=https://web99.ie#' "$ENV_FILE"
else
  printf '\nAPP_URL=https://web99.ie\n' >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
chown ubuntu:ubuntu "$ENV_FILE"

cat >/usr/local/bin/web99-deploy <<'EOF'
#!/usr/bin/env bash
exec sudo bash /srv/web99/app/ops/deploy.sh "$@"
EOF
cat >/usr/local/bin/web99-doctor <<'EOF'
#!/usr/bin/env bash
exec sudo bash /srv/web99/app/ops/doctor.sh "$@"
EOF
cat >/usr/local/bin/web99-backup <<'EOF'
#!/usr/bin/env bash
exec sudo env WEB99_ENV_FILE=/srv/web99/config/dashboard.env WEB99_BACKUP_DIR=/srv/web99/backups bash /srv/web99/app/ops/backup.sh "$@"
EOF
chmod 755 /usr/local/bin/web99-deploy /usr/local/bin/web99-doctor /usr/local/bin/web99-backup

log "deploying Web99 into the single live directory"
bash "$SOURCE_DIR/ops/deploy.sh"

# Old release/symlink machinery is no longer part of production. Leave any old
# release directories untouched for manual cleanup after the new runtime is proven.
rm -f /srv/web99/current 2>/dev/null || true

log "installation complete"
log "live runtime:   /srv/web99/live"
log "future deploy:  web99-deploy"
log "diagnostics:    web99-doctor"
log "manual backup:  web99-backup"
