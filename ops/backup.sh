#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"
BACKUP_DIR="${WEB99_BACKUP_DIR:-/srv/web99/backups}"
RETENTION_DAYS="${WEB99_BACKUP_RETENTION_DAYS:-14}"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "DATABASE_URL missing" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$BACKUP_DIR/.web99-$STAMP.dump.tmp"
OUT="$BACKUP_DIR/web99-$STAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$TMP"
mv "$TMP" "$OUT"
chmod 600 "$OUT"

# Delete only Web99 dump files older than retention window.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'web99-*.dump' -mtime "+$RETENTION_DAYS" -delete

echo "Backup complete: $OUT"
