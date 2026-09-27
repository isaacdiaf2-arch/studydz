# Study DZ — On-Premise Deployment

## Overview
This directory contains everything needed to deploy Study DZ on a local server inside the institution's network.

## Requirements
- Docker 20+ and Docker Compose
- 2 CPU cores, 4 GB RAM minimum
- 10 GB disk space
- PostgreSQL 16 (provided via Docker)

## Quick Start

1. **Generate a database password:**
   ```bash
   mkdir -p secrets
   openssl rand -hex 24 > secrets/db_password.txt
   ```

2. **Place your license file:**
   ```bash
   # Download license.json from the Study DZ cloud dashboard
   # (Download Center page) and place it here:
   cp /path/to/license.json ./license.json
   ```

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec db psql -U studydz -d studydz -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"
   ./scripts/run-migrations.sh
   ```

5. **Access the application:**
   Navigate to `http://localhost:3000` (or the server's internal IP).

## Backup

```bash
./scripts/backup.sh
```

Creates a timestamped backup in `backups/` containing:
- `database.sql.gz` — full PostgreSQL dump
- `files.tar.gz` — local file storage (if any)
- `manifest.json` — backup metadata

## Restore

```bash
./scripts/restore.sh <timestamp>
# Example: ./scripts/restore.sh 20260927_120000
```

**Warning:** Restore overwrites all current data. Type `CONFIRM` when prompted.

## Version Check

```bash
./scripts/check-version.sh
```

Compares the local version against the latest release. If an update is available, run `./scripts/run-migrations.sh` — it backs up the database before applying any new migrations.

## Scheduled Backups (cron)

Add to crontab for daily backups at 2 AM:
```
0 2 * * * /path/to/on-premise/scripts/backup.sh >> /var/log/studydz-backup.log 2>&1
```

## Directory Structure
```
on-premise/
├── docker-compose.yml    # Docker services (db + app)
├── Dockerfile            # Application container image
├── VERSION               # Current installation version
├── migrations/           # SQL migration files (copied from supabase/migrations)
├── scripts/
│   ├── run-migrations.sh # Apply migrations with auto-backup
│   ├── backup.sh         # Full backup (DB + files)
│   ├── restore.sh        # Restore from backup
│   └── check-version.sh  # Check for updates
├── backups/              # Backup output directory
├── data/                  # Local file storage
└── secrets/               # Database password (keep secure)
```

## License Binding
The `license.json` file downloaded from the cloud dashboard contains:
- Institution ID and name
- License key
- Installation ID (unique to this deployment)
- Expiry date

The system verifies this license on startup. A license bound to one installation cannot be used on another.
