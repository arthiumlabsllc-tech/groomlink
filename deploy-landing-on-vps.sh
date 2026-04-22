#!/bin/bash

# GroomLink Landing Page Deployment Script
# Run this script ON YOUR VPS server

set -e

echo "=== GroomLink Landing Page Deployment ==="
echo ""

# Navigate to landing directory
cd /root/GroomLink/apps/landing

echo "Step 1: Creating optimized Dockerfile..."
cat > Dockerfile << 'DOCKERFILE_END'
FROM nginx:alpine

# Copy built files
COPY dist/ /usr/share/nginx/html/

# Copy nginx configuration  
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE_END

echo "✓ Dockerfile created"
echo ""

# Verify files exist
echo "Step 2: Verifying files..."
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ folder not found!"
    exit 1
fi

if [ ! -f "nginx.conf" ]; then
    echo "❌ Error: nginx.conf not found!"
    exit 1
fi

echo "✓ All files present"
ls -la
echo ""

# Stop and remove old container
echo "Step 3: Stopping old container..."
docker stop groomlink-landing 2>/dev/null || true
docker rm groomlink-landing 2>/dev/null || true
echo "✓ Old container removed"
echo ""

# Build new image
echo "Step 4: Building Docker image..."
docker build -t groomlink-landing:latest .
echo "✓ Docker image built"
echo ""

# Start new container
echo "Step 5: Starting new container..."
docker run -d \
  --name groomlink-landing \
  --restart always \
  -p 8081:80 \
  groomlink-landing:latest

echo "✓ Container started"
echo ""

# Wait for container to initialize
echo "Step 6: Waiting for container to start..."
sleep 3

# Verify container is running
echo "Step 7: Verifying deployment..."
if docker ps | grep -q groomlink-landing; then
    echo "✓ Container is running"
    echo ""
    docker ps | grep landing
    echo ""
    
    # Test the landing page
    echo "Step 8: Testing landing page..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✓ Landing page is accessible (HTTP $HTTP_STATUS)"
    else
        echo "⚠ Landing page returned HTTP $HTTP_STATUS"
    fi
    
    echo ""
    echo "=== Deployment Complete! ==="
    echo ""
    echo "Your landing page should now be live at:"
    echo "  • Homepage: https://groomlinkgh.com"
    echo "  • Privacy Policy: https://groomlinkgh.com/privacy"
    echo "  • Data Deletion: https://groomlinkgh.com/delete-account"
    echo ""
    echo "To view logs: docker logs groomlink-landing"
    echo "To restart: docker restart groomlink-landing"
    echo ""
else
    echo "❌ Container failed to start!"
    echo "Check logs: docker logs groomlink-landing"
    exit 1
fi
