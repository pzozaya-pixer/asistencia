#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <directorio-backup-minio>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

MINIO_CONTAINER="${MINIO_CONTAINER:-asistencia-minio}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
SOURCE_DIR="$1"

docker run --rm \
  --network "container:$MINIO_CONTAINER" \
  -v "$SOURCE_DIR:/restore" \
  minio/mc:RELEASE.2025-02-21T16-00-46Z \
  sh -c "
    mc alias set local '$MINIO_ENDPOINT' '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' &&
    mc mirror --overwrite --preserve /restore local
  "

echo "Restauracion MinIO completada desde $SOURCE_DIR"
