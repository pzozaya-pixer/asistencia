#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

find "$BACKUP_OUTPUT_DIR/postgres" -type f -name '*.sql.gz' -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_OUTPUT_DIR/minio" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +

echo "Retencion local aplicada sobre $BACKUP_OUTPUT_DIR"
