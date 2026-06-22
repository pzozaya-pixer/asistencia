#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT_DIR/backups}"
POSTGRES_LATEST="$BACKUP_OUTPUT_DIR/postgres/latest.sql.gz"
MINIO_LATEST="$BACKUP_OUTPUT_DIR/minio/latest"

if [[ ! -f "$POSTGRES_LATEST" ]]; then
  echo "No existe el ultimo backup PostgreSQL: $POSTGRES_LATEST" >&2
  exit 1
fi

gzip -t "$POSTGRES_LATEST"

if [[ ! -L "$MINIO_LATEST" && ! -d "$MINIO_LATEST" ]]; then
  echo "No existe el ultimo backup MinIO: $MINIO_LATEST" >&2
  exit 1
fi

MINIO_REAL_DIR="$(cd "$(dirname "$MINIO_LATEST")" && cd "$(readlink "$MINIO_LATEST" 2>/dev/null || basename "$MINIO_LATEST")" && pwd)"

if [[ -f "$MINIO_REAL_DIR/manifest.sha256" ]]; then
  (cd "$MINIO_REAL_DIR" && shasum -a 256 -c manifest.sha256)
fi

echo "Verificacion local completada"
