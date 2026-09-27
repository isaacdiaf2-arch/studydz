#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Restore Script (supports encrypted backups)
# Restores a backup to the local PostgreSQL database and file storage.
# Usage: ./restore.sh <backup-timestamp> [DATABASE_URL]
# Example: ./restore.sh 20260927_120000

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUPS_DIR="$SCRIPT_DIR/../backups"
DATA_DIR="$SCRIPT_DIR/../data"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

BACKUP_TS="${1:?Usage: ./restore.sh <backup-timestamp> [DATABASE_URL]}"
DB_URL="${2:-${DATABASE_URL:-postgres://studydz:studydz@localhost:5432/studydz}}"

BACKUP_DIR="$BACKUPS_DIR/$BACKUP_TS"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup not found: $BACKUP_DIR"
  echo "Available backups:"
  ls -1 "$BACKUPS_DIR" 2>/dev/null || echo "  (none)"
  exit 1
fi

# Determine encryption passphrase
PASSPHRASE=""
if [ -f "$SECRETS_DIR/backup_passphrase.txt" ]; then
  PASSPHRASE=$(cat "$SECRETS_DIR/backup_passphrase.txt" | tr -d '[:space:]')
elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  PASSPHRASE="$BACKUP_PASSPHRASE"
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
DB_ENC="$BACKUP_DIR/database.sql.gz.enc"
DB_RAW="$BACKUP_DIR/database.sql.gz"

if [ -f "$DB_ENC" ] && [ -n "$PASSPHRASE" ]; then
  echo "[1/2] Restoring encrypted database..."
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$DB_ENC" -pass "pass:$PASSPHRASE" | gunzip | psql "$DB_URL"
  echo "  Database restored (decrypted)."
elif [ -f "$DB_RAW" ]; then
  echo "[1/2] Restoring database..."
  gunzip -c "$DB_RAW" | psql "$DB_URL"
  echo "  Database restored."
elif [ -f "$DB_ENC" ]; then
  echo "[1/2] ERROR: Encrypted backup found but no passphrase provided."
  echo "  Set BACKUP_PASSPHRASE or create secrets/backup_passphrase.txt"
  exit 1
else
  echo "[1/2] No database backup found, skipping."
fi

# 2. Restore files
FILES_ENC="$BACKUP_DIR/files.tar.gz.enc"
FILES_RAW="$BACKUP_DIR/files.tar.gz"

if [ -f "$FILES_ENC" ] && [ -n "$PASSPHRASE" ]; then
  echo "[2/2] Restoring encrypted file storage..."
  mkdir -p "$DATA_DIR"
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$FILES_ENC" -pass "pass:$PASSPHRASE" | tar -xzf - -C "$DATA_DIR"
  echo "  Files restored (decrypted)."
elif [ -f "$FILES_RAW" ]; then
  echo "[2/2] Restoring file storage..."
  mkdir -p "$DATA_DIR"
  tar -xzf "$FILES_RAW" -C "$DATA_DIR"
  echo "  Files restored."
elif [ -f "$FILES_ENC" ]; then
  echo "[2/2] ERROR: Encrypted files found but no passphrase provided."
  exit 1
else
  echo "[2/2] No file backup found, skipping."
fi

echo ""
echo "Restore complete from: $BACKUP_DIR"
