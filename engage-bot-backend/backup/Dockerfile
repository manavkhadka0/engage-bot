# syntax=docker/dockerfile:1
# Nightly Postgres backups to any S3-compatible bucket (Cloudflare R2, B2, MinIO).
# Built from the official postgres image so pg_dump always matches the server major.
FROM postgres:16-alpine
RUN apk add --no-cache aws-cli
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
# postgres:16-alpine ships a docker-entrypoint; replace it with ours.
ENTRYPOINT ["/usr/local/bin/backup.sh"]
CMD ["daemon"]
