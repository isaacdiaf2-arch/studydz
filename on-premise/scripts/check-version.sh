#!/usr/bin/env bash
set -euo pipefail

# Study DZ — Version Checker
# Compares the local installation version against the latest known release.
# Exits with code 0 if up-to-date, 1 if an update is available.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION_FILE="$SCRIPT_DIR/../VERSION"

if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: VERSION file not found. Installation may be incomplete."
  exit 1
fi

CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
echo "Current installation version: $CURRENT_VERSION"

# Check against remote version endpoint (if network is available)
REMOTE_URL="${STUDYDZ_VERSION_URL:-https://studydz.app/api/version}"

if command -v curl &>/dev/null; then
  LATEST=$(curl -s --max-time 5 "$REMOTE_URL" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -z "$LATEST" ]; then
    echo "Could not check for updates (no network or server unavailable)."
    echo "You are running version $CURRENT_VERSION."
    exit 0
  fi

  if [ "$CURRENT_VERSION" = "$LATEST" ]; then
    echo "You are running the latest version."
    exit 0
  else
    echo "UPDATE AVAILABLE: $LATEST (current: $CURRENT_VERSION)"
    echo "Run ./scripts/run-migrations.sh to update safely."
    exit 1
  fi
else
  echo "curl not available. You are running version $CURRENT_VERSION."
  exit 0
fi
