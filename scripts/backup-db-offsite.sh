#!/usr/bin/env bash
# Run backup-db.sh then copy latest dump offsite when BACKUP_S3_URI is set.
# Usage: BACKUP_S3_URI=s3://my-bucket/carelink-backups/ ./scripts/backup-db-offsite.sh
# Also supports: rclone copy, or scp via BACKUP_SCP_TARGET=user@host:/path/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="$("$ROOT/scripts/backup-db.sh" | awk '/Backup written:/ {print $3}')"
if [[ ! -f "$OUT" ]]; then
  echo "Error: backup file missing" >&2
  exit 1
fi

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$OUT" "${BACKUP_S3_URI%/}/$(basename "$OUT")"
    echo "Offsite copy: ${BACKUP_S3_URI%/}/$(basename "$OUT")"
    exit 0
  fi
  echo "Error: BACKUP_S3_URI set but aws CLI not found" >&2
  exit 1
fi

if [[ -n "${BACKUP_SCP_TARGET:-}" ]]; then
  scp "$OUT" "${BACKUP_SCP_TARGET%/}/$(basename "$OUT")"
  echo "Offsite copy via scp: ${BACKUP_SCP_TARGET%/}/$(basename "$OUT")"
  exit 0
fi

if [[ -n "${BACKUP_RCLONE_TARGET:-}" ]]; then
  rclone copy "$OUT" "${BACKUP_RCLONE_TARGET%/}/"
  echo "Offsite copy via rclone: ${BACKUP_RCLONE_TARGET%/}/$(basename "$OUT")"
  exit 0
fi

echo "Backup local only: $OUT"
echo "Set BACKUP_S3_URI, BACKUP_SCP_TARGET, or BACKUP_RCLONE_TARGET for offsite copy."
