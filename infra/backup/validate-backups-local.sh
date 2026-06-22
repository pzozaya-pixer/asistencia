#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/backup-postgres.sh"
"$SCRIPT_DIR/backup-minio.sh"
"$SCRIPT_DIR/verify-backups.sh"

echo "Validacion local de backups completada"
