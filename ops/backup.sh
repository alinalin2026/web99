#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${WEB99_ENV_FILE:-/srv/web99/config/dashboard.env}"
BACKUP_DIR="${WEB99_BACKUP_DIR:-/srv/web99/backups}"
RETENTION_DAYS="${WEB99_BACKUP_RETENTION_DAYS:-14}"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required" >&2; exit 1; }

DATABASE_URL="$(node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
[[ -n "$DATABASE_URL" ]] || { echo "DATABASE_URL missing" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$BACKUP_DIR/.web99-$STAMP.dump.tmp"
OUT="$BACKUP_DIR/web99-$STAMP.dump"
trap 'rm -f "$TMP"' EXIT

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$TMP"
[[ -s "$TMP" ]] || { echo "Backup dump is empty" >&2; exit 1; }
mv "$TMP" "$OUT"
chmod 600 "$OUT"
trap - EXIT

# Verify the custom dump is readable before reporting success.
pg_restore --list "$OUT" >/dev/null

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'web99-*.dump' -mtime "+$RETENTION_DAYS" -delete

echo "Backup complete: $OUT"
