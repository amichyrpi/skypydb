#!/usr/bin/env bash
set -euo pipefail

: "${MYSQL_HOST:?MYSQL_HOST is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"

INTERVAL_SECONDS="${MYSQLDUMP_CRON_SECONDS:-3600}"

mkdir -p /backups

echo "Starting mysql backup loop (interval=${INTERVAL_SECONDS}s)"
while true; do
  TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  OUTPUT_FILE="/backups/skypydb-${TIMESTAMP}.sql.gz"
  mysqldump \
    --host="${MYSQL_HOST}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --single-transaction \
    --quick \
    --routines \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${OUTPUT_FILE}"
  echo "Backup completed: ${OUTPUT_FILE}"
  sleep "${INTERVAL_SECONDS}"
done
