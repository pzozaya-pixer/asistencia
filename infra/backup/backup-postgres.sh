#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT_DIR/backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-asistencia-postgres}"
POSTGRES_DB="${POSTGRES_DB:-asistencia}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

STAMP="$(date +"%Y%m%d-%H%M%S")"
TARGET_DIR="$BACKUP_OUTPUT_DIR/postgres"
TARGET_FILE="$TARGET_DIR/${POSTGRES_DB}-${STAMP}.sql.gz"
LATEST_LINK="$TARGET_DIR/latest.sql.gz"

mkdir -p "$TARGET_DIR"

docker exec "$POSTGRES_CONTAINER" sh -lc \
  "pg_dump -U '$POSTGRES_USER' -d '$POSTGRES_DB' --clean --if-exists --no-owner --no-privileges" \
  | gzip -9 > "$TARGET_FILE"

gzip -t "$TARGET_FILE"
ln -sfn "$(basename "$TARGET_FILE")" "$LATEST_LINK"

echo "PostgreSQL backup creado en $TARGET_FILE"
