#!/usr/bin/env bash
# Wires EspoCRM's file storage to the MinIO bucket. Run this ONCE, after
# `docker compose up -d` has finished and EspoCRM's initial install is
# complete (open http://localhost:8080 and confirm you can log in first).
#
# Usage: ./scripts/configure-s3-storage.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found — copy .env.example to .env and fill it in first." >&2
  exit 1
fi
set -a
source .env
set +a

echo "Copying config script into the espocrm container..."
docker compose cp scripts/configure-s3-storage.php espocrm:/tmp/configure-s3-storage.php

echo "Applying S3/MinIO storage configuration..."
docker compose exec \
  -e MINIO_BUCKET="${MINIO_BUCKET:-espocrm-files}" \
  -e MINIO_ROOT_USER="${MINIO_ROOT_USER}" \
  -e MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
  espocrm php /tmp/configure-s3-storage.php

echo "Restarting EspoCRM services to pick up the new config..."
docker compose restart espocrm espocrm-daemon espocrm-websocket

echo "Done. New uploads, documents, and call recordings will now be stored in MinIO."
echo "MinIO console: http://localhost:${MINIO_CONSOLE_PORT:-9001} (login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD)"
