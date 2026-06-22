#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/backup-postgres.sh"
"$SCRIPT_DIR/backup-minio.sh"
"$SCRIPT_DIR/verify-backups.sh"
"$SCRIPT_DIR/push-remote-backups.sh"
"$SCRIPT_DIR/prune-local-backups.sh"

echo "Ciclo completo de backup ejecutado"
