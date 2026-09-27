#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Encrypted Backup Script
# Creates a full encrypted backup of the PostgreSQL database and local file storage.
# Usage: ./backup.sh [DATABASE_URL]
# Set BACKUP_PASSPHRASE env var or create secrets/backup_passphrase.txt for encryption.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUPS_DIR="$SCRIPT_DIR/../backups"
DATA_DIR="$SCRIPT_DIR/../data"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

DB_URL="${1:-${DATABASE_URL:-postgres://studydz:studydz@localhost:5432/studydz}}"

# Determine encryption passphrase
PASSPHRASE=""
if [ -f "$SECRETS_DIR/backup_passphrase.txt" ]; then
  PASSPHRASE=$(cat "$SECRETS_DIR/backup_passphrase.txt" | tr -d '[:space:]')
elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  PASSPHRASE="$BACKUP_PASSPHRASE"
fi

ENCRYPT=""
if [ -n "$PASSPHRASE" ] && command -v openssl &>/dev/null; then
  ENCRYPT="yes"
  echo "Encryption: enabled (openssl AES-256-CBC)"
else
  ENCRYPT="no"
  echo "Encryption: disabled (no passphrase or openssl not found)"
fi

mkdir -p "$BACKUPS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUPS_DIR/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "=== Study DZ Backup ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# 1. Database backup
echo "[1/2] Backing up database..."
DB_RAW="$BACKUP_DIR/database.sql.gz"
pg_dump "$DB_URL" | gzip > "$DB_RAW"

if [ "$ENCRYPT" = "yes" ]; then
  DB_FILE="$BACKUP_DIR/database.sql.gz.enc"
  openssl enc -aes-256-cbc -salt -pbkdf2 -in "$DB_RAW" -out "$DB_FILE" -pass "pass:$PASSPHRASE"
  rm "$DB_RAW"
  echo "  Database: $DB_FILE (encrypted)"
else
  DB_FILE="$DB_RAW"
  DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
  echo "  Database: $DB_FILE ($DB_SIZE)"
fi

# 2. File storage backup
echo "[2/2] Backing up file storage..."
if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  FILES_RAW="$BACKUP_DIR/files.tar.gz"
  tar -czf "$FILES_RAW" -C "$DATA_DIR" .

  if [ "$ENCRYPT" = "yes" ]; then
    FILES_FILE="$BACKUP_DIR/files.tar.gz.enc"
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$FILES_RAW" -out "$FILES_FILE" -pass "pass:$PASSPHRASE"
    rm "$FILES_RAW"
    echo "  Files: $FILES_FILE (encrypted)"
  else
    FILES_SIZE=$(du -h "$FILES_RAW" | cut -f1)
    echo "  Files: $FILES_RAW ($FILES_SIZE)"
  fi
else
  echo "  No files to backup."
fi

# 3. Create manifest
HAS_FILES="none"
if [ -f "$BACKUP_DIR/files.tar.gz" ] || [ -f "$BACKUP_DIR/files.tar.gz.enc" ]; then
  HAS_FILES="files.tar.gz"
  [ "$ENCRYPT" = "yes" ] && HAS_FILES="files.tar.gz.enc"
fi

cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "created_at": "$(date -Iseconds)",
  "version": "1.0",
  "encrypted": $([ "$ENCRYPT" = "yes" ] && echo 'true' || echo 'false'),
  "database": "$([ "$ENCRYPT" = "yes" ] && echo 'database.sql.gz.enc' || echo 'database.sql.gz')",
  "files": "$HAS_FILES"
}
EOF

# 4. Cleanup old backups (keep last 30 days)
find "$BACKUPS_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

echo ""
echo "Backup complete: $BACKUP_DIR"
