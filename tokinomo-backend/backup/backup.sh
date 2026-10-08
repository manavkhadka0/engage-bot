#!/bin/sh
# Postgres -> S3-compatible bucket backups.
#
#   backup.sh daemon            (default) back up now, then once a day at BACKUP_HOUR_UTC
#   backup.sh once              one backup, then exit
#   backup.sh list              list stored backups
#   backup.sh restore <key>     restore a backup INTO $RESTORE_DATABASE_URL
#
# Restore never touches $DATABASE_URL: you must name the target explicitly with
# RESTORE_DATABASE_URL, so a typo can't overwrite the live database. Restore into
# an EMPTY database (psql replays plain SQL; it does not drop existing objects).
#
# Required env: DATABASE_URL, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
# Optional env: S3_REGION (auto), BACKUP_PREFIX (backups), BACKUP_HOUR_UTC (3),
#               BACKUP_KEEP_DAYS (14), BACKUP_ON_START (true)
set -eu

: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID is required}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY is required}"

PREFIX="${BACKUP_PREFIX:-backups}"
HOUR="${BACKUP_HOUR_UTC:-3}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
ON_START="${BACKUP_ON_START:-true}"

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
# Newer aws-cli versions attach CRC checksums that R2, B2 and older S3-compatible
# stores can reject; only compute them when an operation requires one.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

s3() { aws --endpoint-url "$S3_ENDPOINT" "$@"; }
log() { echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

prune() {
  cutoff_epoch=$(( $(date -u +%s) - KEEP_DAYS * 86400 ))
  cutoff=$(date -u -d "@$cutoff_epoch" +%Y%m%dT%H%M%SZ)
  # Only ever delete names that exactly match our own pattern.
  s3 s3 ls "s3://$S3_BUCKET/$PREFIX/" | awk '{print $4}' | while read -r name; do
    case "$name" in
      tokinomo-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z.sql.gz)
        ts=${name#tokinomo-}
        ts=${ts%.sql.gz}
        if awk -v a="$ts" -v b="$cutoff" 'BEGIN { exit !(a < b) }'; then
          log "pruning $name (older than $KEEP_DAYS days)"
          s3 s3 rm "s3://$S3_BUCKET/$PREFIX/$name" --only-show-errors
        fi
        ;;
    esac
  done
}

run_backup() {
  : "${DATABASE_URL:?DATABASE_URL is required}"
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  key="$PREFIX/tokinomo-$stamp.sql.gz"
  sql="/tmp/tokinomo-$stamp.sql"
  log "dumping database -> $key"
  # Dump to a file first (not a pipe) so a pg_dump failure fails the script.
  pg_dump --no-owner --no-privileges --file="$sql" "$DATABASE_URL"
  gzip -9 "$sql"
  size=$(wc -c < "$sql.gz")
  if [ "$size" -lt 1000 ]; then
    log "ERROR dump is suspiciously small ($size bytes); not uploading"
    rm -f "$sql.gz"
    return 1
  fi
  s3 s3 cp "$sql.gz" "s3://$S3_BUCKET/$key" --only-show-errors
  remote=$(s3 s3api head-object --bucket "$S3_BUCKET" --key "$key" --query ContentLength --output text)
  rm -f "$sql.gz"
  if [ "$remote" != "$size" ]; then
    log "ERROR uploaded size $remote does not match local size $size"
    return 1
  fi
  log "OK $key ($size bytes)"
  prune
}

seconds_until_next() {
  now=$(date -u +%s)
  target=$(date -u -d "$(date -u +%Y-%m-%d) $(printf '%02d' "$HOUR"):00:00" +%s)
  [ "$target" -gt "$now" ] || target=$(( target + 86400 ))
  echo $(( target - now ))
}

case "${1:-daemon}" in
  once)
    run_backup
    ;;
  list)
    s3 s3 ls "s3://$S3_BUCKET/$PREFIX/"
    ;;
  restore)
    key="${2:?usage: backup.sh restore <key, e.g. backups/tokinomo-20261008T030000Z.sql.gz>}"
    : "${RESTORE_DATABASE_URL:?set RESTORE_DATABASE_URL to the EMPTY database to restore into}"
    log "restoring $key -> restore target (not DATABASE_URL)"
    s3 s3 cp "s3://$S3_BUCKET/$key" - | gunzip | psql --set ON_ERROR_STOP=1 --quiet "$RESTORE_DATABASE_URL"
    log "restore finished"
    ;;
  daemon)
    log "daemon started: daily at ${HOUR}:00 UTC, keeping $KEEP_DAYS days, bucket=$S3_BUCKET prefix=$PREFIX"
    if [ "$ON_START" = "true" ]; then
      # On a fresh deploy the schema may not exist yet (the API creates it on its
      # first boot), which yields a near-empty dump that run_backup refuses to
      # upload. Retry a few times instead of waiting a whole day.
      attempt=1
      until run_backup; do
        if [ "$attempt" -ge 5 ]; then
          log "initial backup failed $attempt times; will retry at the next scheduled time"
          break
        fi
        attempt=$((attempt + 1))
        sleep 30
      done
    fi
    while true; do
      sleep "$(seconds_until_next)"
      run_backup || log "scheduled backup failed; will retry tomorrow (check the error above)"
    done
    ;;
  *)
    echo "usage: backup.sh [daemon|once|list|restore <key>]" >&2
    exit 64
    ;;
esac
