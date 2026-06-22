#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$SCRIPT_DIR/backup.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/backup.env"
fi

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT_DIR/backups}"
RCLONE_REMOTE_NAME="${RCLONE_REMOTE_NAME:-backup-remote}"
RCLONE_REMOTE_PATH="${RCLONE_REMOTE_PATH:-/asistencia-demo}"
RCLONE_CONFIG_PATH="${RCLONE_CONFIG_PATH:-}"

RCLONE_ARGS=()
if [[ -n "$RCLONE_CONFIG_PATH" ]]; then
  RCLONE_ARGS+=("--config" "$RCLONE_CONFIG_PATH")
fi

rclone "${RCLONE_ARGS[@]}" copy "$BACKUP_OUTPUT_DIR" "${RCLONE_REMOTE_NAME}:${RCLONE_REMOTE_PATH}" --create-empty-src-dirs --transfers 4 --checkers 8
rclone "${RCLONE_ARGS[@]}" check "$BACKUP_OUTPUT_DIR" "${RCLONE_REMOTE_NAME}:${RCLONE_REMOTE_PATH}" --one-way

echo "Backups sincronizados con ${RCLONE_REMOTE_NAME}:${RCLONE_REMOTE_PATH}"
