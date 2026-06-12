#!/usr/bin/env bash
# Fast demo seed via psql (~1 second). Clears DB first, then inserts fresh data.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="${POSTGRES_URL:-postgresql://cogniq:cogniq@127.0.0.1:5433/cogniq}"
URL="${URL/localhost/127.0.0.1}"

echo "[seed] Clearing + seeding via psql..."
psql "$URL" -v ON_ERROR_STOP=1 -f "$DIR/seed.sql"
echo ""
echo "[seed] Done! Demo credentials:"
echo "  Customer : alice@demo.com          / password123"
echo "  Customer : bob@demo.com            / password123"
echo "  Analyst  : ravi.analyst@bank.com   / password123"
