#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${WEB99_SOURCE_DIR:-/srv/web99/app}"
CONFIG_DIR="${WEB99_CONFIG_DIR:-/srv/web99/config}"
ENV_FILE="$CONFIG_DIR/dashboard.env"

log() { printf '[install] %s\n' "$*"; }
die() { printf '[install] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
[[ -d "$SOURCE_DIR/.git" ]] || die "missing Git checkout at $SOURCE_DIR"

for cmd in git node npm nginx psql pg_dump curl flock; do
  command -v "$cmd" >/dev/null 2>&1 || die "required command missing: $cmd"
done

[[ -f /etc/letsencrypt/live/web99.ie/fullchain.pem ]] || die "web99.ie certificate not found in /etc/letsencrypt/live/web99.ie"

mkdir -p "$CONFIG_DIR" /srv/web99/releases /srv/web99/backups
chown -R ubuntu:ubuntu "$CONFIG_DIR" /srv/web99/releases /srv/web99/backups
chmod 700 "$CONFIG_DIR" /srv/web99/backups

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$SOURCE_DIR/dashboard/.env.local" ]]; then
    log "moving existing dashboard secrets into persistent config"
    cp "$SOURCE_DIR/dashboard/.env.local" "$ENV_FILE"
  else
    die "no $ENV_FILE and no existing dashboard/.env.local to migrate"
  fi
fi

# One canonical public URL. Do not print the env file because it contains keys.
if grep -q '^APP_URL=' "$ENV_FILE"; then
  sed -i 's#^APP_URL=.*#APP_URL=https://web99.ie#' "$ENV_FILE"
else
  printf '\nAPP_URL=https://web99.ie\n' >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
chown ubuntu:ubuntu "$ENV_FILE"

# Stable phone-friendly admin commands.
cat >/usr/local/bin/web99-deploy <<'EOF'
#!/usr/bin/env bash
exec sudo bash /srv/web99/app/ops/deploy.sh "$@"
EOF
cat >/usr/local/bin/web99-doctor <<'EOF'
#!/usr/bin/env bash
exec sudo bash /srv/web99/current/ops/doctor.sh "$@"
EOF
chmod 755 /usr/local/bin/web99-deploy /usr/local/bin/web99-doctor

log "performing first atomic production deployment"
bash "$SOURCE_DIR/ops/deploy.sh"

log "installation complete"
log "future deploy: web99-deploy"
log "diagnostics:   web99-doctor"
