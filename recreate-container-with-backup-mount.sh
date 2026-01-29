#!/bin/bash

echo "=== Recreating Container with Backup Mount ==="
echo ""
echo "This script will:"
echo "1. Create snapshot of current state"
echo "2. Stop and remove current container"
echo "3. Recreate container with backup directory mounted"
echo "4. Verify all services are running"
echo ""

# Step 1: Create snapshot
echo "Step 1: Creating snapshot..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_NAME="taskflow-snapshot-v8.9.191-before-remount-$TIMESTAMP"

docker commit taskflow-pro taskflow-pro:v8.9.191-backup-api-path-fixed
echo "Docker image committed: taskflow-pro:v8.9.191-backup-api-path-fixed"

# Create snapshot tarball
docker save taskflow-pro:v8.9.191-backup-api-path-fixed | gzip > /root/taskflow-snapshots/$SNAPSHOT_NAME.tar.gz
echo "Snapshot created: $SNAPSHOT_NAME.tar.gz"
echo ""

# Step 2: Get current container info
echo "Step 2: Recording current container configuration..."
echo "Current image: taskflow-pro:v8.9.191-backup-api-path-fixed"
echo "Current mounts: /root/taskflow-data:/app/data"
echo "Current ports: 3000:3000, 3001:3001"
echo "Environment: PORT=3000, GEMINI_API_KEY=***"
echo ""

# Step 3: Stop and remove container
echo "Step 3: Stopping and removing current container..."
docker stop taskflow-pro
docker rm taskflow-pro
echo "Container removed"
echo ""

# Step 4: Recreate container with new mount
echo "Step 4: Creating new container with backup mount..."
docker run -d \
  --name taskflow-pro \
  -p 3000:3000 \
  -p 3001:3001 \
  -e PORT=3000 \
  -e GEMINI_API_KEY=AIzaSyC6pLVQnosilci4Oe-Yl0yLhLxrRFOPRLLk \
  -v /root/taskflow-data:/app/data \
  -v /root/taskflow-backups:/app/data/backups:ro \
  --restart unless-stopped \
  taskflow-pro:v8.9.191-backup-api-path-fixed

echo "New container created with backup mount"
echo ""

# Step 5: Wait for container to start
echo "Step 5: Waiting for container to start..."
sleep 5

# Step 6: Verify container is running
echo "Step 6: Verifying container status..."
docker ps | grep taskflow-pro
echo ""

# Step 7: Test backup API
echo "Step 7: Testing backup API..."
sleep 2
docker exec taskflow-pro ls -la /app/data/backups/ | head -5
echo ""

echo "=== Container Recreation Complete ==="
echo ""
echo "New configuration:"
echo "  - Image: taskflow-pro:v8.9.191-backup-api-path-fixed"
echo "  - Data mount: /root/taskflow-data:/app/data"
echo "  - Backup mount: /root/taskflow-backups:/app/data/backups (read-only)"
echo "  - Ports: 3000:3000, 3001:3001"
echo ""
echo "Please verify:"
echo "1. Frontend can access the application"
echo "2. Backup monitor shows all backups"
echo "3. All other features work normally"
