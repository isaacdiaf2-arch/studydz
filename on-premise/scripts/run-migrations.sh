#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Local Migration Runner
# Applies SQL migrations in order to a local PostgreSQL database.
# Creates a backup before applying migrations.
# Usage: ./run-migrations.sh [DATABASE_URL]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
BACKUPS_DIR="$SCRIPT_DIR/../backups"

DB_URL="${1:-${DATABASE_URL:-postgres://studydz:studydz@localhost:5432/studydz}}"

mkdir -p "$BACKUPS_DIR"

if ! command -v psql &>/dev/null; then
  echo "ERROR: psql is not installed. Install PostgreSQL client tools."
  exit 1
fi

psql "$DB_URL" -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUPS_DIR/pre-migration-$TIMESTAMP.sql.gz"
echo "Creating backup: $BACKUP_FILE"
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"

APPLIED=0
SKIPPED=0

for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$file")

  EXISTS=$(psql "$DB_URL" -t -c "SELECT 1 FROM schema_migrations WHERE filename = '$filename'" | tr -d '[:space:]')

  if [ "$EXISTS" = "1" ]; then
    echo "SKIP: $filename (already applied)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "APPLYING: $filename"
  psql "$DB_URL" -f "$file" -v ON_ERROR_STOP=1

  psql "$DB_URL" -c "INSERT INTO schema_migrations (filename) VALUES ('$filename')"
  echo "DONE: $filename"
  APPLIED=$((APPLIED + 1))
done

echo ""
echo "Migrations complete: $APPLIED applied, $SKIPPED skipped."
echo "Backup saved to: $BACKUP_FILE"
