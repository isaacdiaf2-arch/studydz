#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Backup Script
# Creates a full backup of the PostgreSQL database and local file storage.
# Usage: ./backup.sh [DATABASE_URL]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUPS_DIR="$SCRIPT_DIR/../backups"
DATA_DIR="$SCRIPT_DIR/../data"

DB_URL="${1:-${DATABASE_URL:-postgres://studydz:studydz@localhost:5432/studydz}}"

mkdir -p "$BACKUPS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUPS_DIR/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "=== Study DZ Backup ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# 1. Database backup
echo "[1/2] Backing up database..."
DB_FILE="$BACKUP_DIR/database.sql.gz"
pg_dump "$DB_URL" | gzip > "$DB_FILE"
DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
echo "  Database: $DB_FILE ($DB_SIZE)"

# 2. File storage backup
echo "[2/2] Backing up file storage..."
if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  FILES_FILE="$BACKUP_DIR/files.tar.gz"
  tar -czf "$FILES_FILE" -C "$DATA_DIR" .
  FILES_SIZE=$(du -h "$FILES_FILE" | cut -f1)
  echo "  Files: $FILES_FILE ($FILES_SIZE)"
else
  echo "  No files to backup."
fi

# 3. Create manifest
cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "created_at": "$(date -Iseconds)",
  "version": "1.0",
  "database": "database.sql.gz",
  "files": "$(if [ -f "$BACKUP_DIR/files.tar.gz" ]; then echo 'files.tar.gz'; else echo 'none'; fi)"
}
EOF

echo ""
echo "Backup complete: $BACKUP_DIR"
