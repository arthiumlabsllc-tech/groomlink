#!/bin/bash

# Deploy Landing Page to VPS
# This script uploads the built files and rebuilds the Docker container

set -e

VPS_HOST="187.124.210.205"
VPS_USER="root"
LOCAL_DIST="./apps/landing/dist"
REMOTE_PATH="/root/GroomLink/apps/landing"

echo "=== Deploying Landing Page to VPS ==="
echo ""

# Step 1: Build locally
echo "Step 1: Building landing page..."
cd apps/landing
npm run build
cd ../..
echo "✓ Build complete"
echo ""

# Step 2: Create remote directory if it doesn't exist
echo "Step 2: Setting up remote directory..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "mkdir -p $REMOTE_PATH"
echo "✓ Remote directory ready"
echo ""

# Step 3: Upload Dockerfile and nginx config
echo "Step 3: Uploading Docker configuration..."
scp -o StrictHostKeyChecking=no apps/landing/Dockerfile $VPS_USER@$VPS_HOST:$REMOTE_PATH/
scp -o StrictHostKeyChecking=no apps/landing/nginx.conf $VPS_USER@$VPS_HOST:$REMOTE_PATH/
echo "✓ Docker configuration uploaded"
echo ""

# Step 4: Upload built files
echo "Step 4: Uploading built files..."
scp -o StrictHostKeyChecking=no -r $LOCAL_DIST/* $VPS_USER@$VPS_HOST:$REMOTE_PATH/dist/
echo "✓ Files uploaded"
echo ""

# Step 5: Rebuild and restart Docker container
echo "Step 5: Rebuilding Docker container on VPS..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /root/GroomLink/apps/landing

echo "Building Docker image..."
docker build -t groomlink-landing:latest .

echo "Stopping old container..."
docker stop groomlink-landing || true
docker rm groomlink-landing || true

echo "Starting new container..."
docker run -d \
  --name groomlink-landing \
  --restart always \
  -p 8081:80 \
  groomlink-landing:latest

echo "Waiting for container to start..."
sleep 5

echo "Checking container status..."
docker ps | grep landing

echo ""
echo "✓ Landing page container rebuilt and restarted"
ENDSSH

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your landing page should now be live at:"
echo "  - Homepage: https://groomlinkgh.com"
echo "  - Privacy Policy: https://groomlinkgh.com/privacy"
echo "  - Data Deletion: https://groomlinkgh.com/delete-account"
echo ""
echo "Please verify the changes are visible."
