#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <backup.sql.gz>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-asistencia-postgres}"
POSTGRES_DB="${POSTGRES_DB:-asistencia}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_FILE="$1"

gzip -t "$BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" sh -lc "psql -U '$POSTGRES_USER' -d '$POSTGRES_DB'"

echo "Restauracion PostgreSQL completada desde $BACKUP_FILE"
