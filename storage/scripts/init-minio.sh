#!/bin/sh
set -e
mc alias set local "http://minio:9000" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"
mc mb --ignore-existing "local/${MINIO_DEFAULT_BUCKET}"
echo "Bucket ${MINIO_DEFAULT_BUCKET} ready."
mc mb --ignore-existing "local/${MINIO_PUBLIC_BUCKET}"
echo "Bucket ${MINIO_PUBLIC_BUCKET} ready."
mc anonymous set download "local/${MINIO_PUBLIC_BUCKET}" || true