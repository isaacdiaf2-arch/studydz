#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Restore Script
# Restores a backup to the local PostgreSQL database and file storage.
# Usage: ./restore.sh <backup-timestamp> [DATABASE_URL]
# Example: ./restore.sh 20260927_120000

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUPS_DIR="$SCRIPT_DIR/../backups"
DATA_DIR="$SCRIPT_DIR/../data"

BACKUP_TS="${1:?Usage: ./restore.sh <backup-timestamp> [DATABASE_URL]}"
DB_URL="${2:-${DATABASE_URL:-postgres://studydz:studydz@localhost:5432/studydz}}"

BACKUP_DIR="$BACKUPS_DIR/$BACKUP_TS"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup not found: $BACKUP_DIR"
  echo "Available backups:"
  ls -1 "$BACKUPS_DIR" 2>/dev/null || echo "  (none)"
  exit 1
fi

echo "=== Study DZ Restore ==="
echo "Backup: $BACKUP_DIR"
echo ""

# Confirm
echo "WARNING: This will OVERWRITE all current data."
read -p "Type 'CONFIRM' to proceed: " CONFIRM
if [ "$CONFIRM" != "CONFIRM" ]; then
  echo "Aborted."
  exit 0
fi

# 1. Restore database
DB_FILE="$BACKUP_DIR/database.sql.gz"
if [ -f "$DB_FILE" ]; then
  echo "[1/2] Restoring database..."
  gunzip -c "$DB_FILE" | psql "$DB_URL"
  echo "  Database restored."
else
  echo "[1/2] No database backup found, skipping."
fi

# 2. Restore files
FILES_FILE="$BACKUP_DIR/files.tar.gz"
if [ -f "$FILES_FILE" ]; then
  echo "[2/2] Restoring file storage..."
  mkdir -p "$DATA_DIR"
  tar -xzf "$FILES_FILE" -C "$DATA_DIR"
  echo "  Files restored."
else
  echo "[2/2] No file backup found, skipping."
fi

echo ""
echo "Restore complete from: $BACKUP_DIR"
