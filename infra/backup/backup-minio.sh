#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT_DIR/backups}"
MINIO_CONTAINER="${MINIO_CONTAINER:-asistencia-minio}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"

STAMP="$(date +"%Y%m%d-%H%M%S")"
TARGET_DIR="$BACKUP_OUTPUT_DIR/minio/$STAMP"
LATEST_LINK="$BACKUP_OUTPUT_DIR/minio/latest"

mkdir -p "$TARGET_DIR"

docker run --rm \
  --network "container:$MINIO_CONTAINER" \
  -v "$TARGET_DIR:/backup" \
  minio/mc:RELEASE.2025-02-21T16-00-46Z \
  sh -c "
    mc alias set local '$MINIO_ENDPOINT' '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' &&
    mc mirror --overwrite --preserve local /backup
  "

find "$TARGET_DIR" -type f -print0 | sort -z | xargs -0 shasum -a 256 > "$TARGET_DIR/manifest.sha256"
ln -sfn "$STAMP" "$LATEST_LINK"

echo "MinIO mirror creado en $TARGET_DIR"
