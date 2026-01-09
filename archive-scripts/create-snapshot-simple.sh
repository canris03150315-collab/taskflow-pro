#!/bin/bash
SNAPSHOT_DIR="/root/taskflow-snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./create-snapshot.sh VERSION"
    exit 1
fi

SNAPSHOT_NAME="taskflow-snapshot-${VERSION}-${TIMESTAMP}"
SNAPSHOT_PATH="${SNAPSHOT_DIR}/${SNAPSHOT_NAME}"

echo "Creating snapshot: ${SNAPSHOT_NAME}"
mkdir -p "${SNAPSHOT_PATH}"

echo "1. Backup Docker image..."
docker commit taskflow-pro taskflow-pro:latest
docker save taskflow-pro:latest > "${SNAPSHOT_PATH}/docker-image.tar"

echo "2. Backup database..."
if [ -f /root/taskflow-data-fresh/taskflow.db ]; then
    cp /root/taskflow-data-fresh/taskflow.db "${SNAPSHOT_PATH}/taskflow.db"
elif [ -f /root/taskflow-data/taskflow.db ]; then
    cp /root/taskflow-data/taskflow.db "${SNAPSHOT_PATH}/taskflow.db"
fi

echo "3. Backup config..."
if [ -f /root/taskflow-data-fresh/.db-key ]; then
    cp /root/taskflow-data-fresh/.db-key "${SNAPSHOT_PATH}/.db-key"
elif [ -f /root/taskflow-data/.db-key ]; then
    cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key"
fi

echo "4. Compress..."
cd "${SNAPSHOT_DIR}"
tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"
rm -rf "${SNAPSHOT_NAME}"

echo "Done: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
du -h "${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
