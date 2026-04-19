#!/bin/bash

# Deploy to VPS Script
# Syncs built files and restarts services on VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VPS_USER="root"
VPS_HOST="187.124.210.205"
VPS_PATH="/root/GroomLink"

echo -e "${GREEN}=== Deploying to VPS ===${NC}"
echo -e "VPS: ${YELLOW}${VPS_USER}@${VPS_HOST}${NC}"
echo ""

# Step 1: Sync admin build
echo -e "${BLUE}Step 1: Syncing admin build...${NC}"
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  /home/ubuntu/Desktop/GroomLink/apps/admin/dist/ \
  ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/admin/dist/

echo -e "${GREEN}✓ Admin build synced${NC}"
echo ""

# Step 2: Sync API build
echo -e "${BLUE}Step 2: Syncing API build...${NC}"
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  /home/ubuntu/Desktop/GroomLink/services/api/dist/ \
  ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/services/api/dist/

rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no" \
  /home/ubuntu/Desktop/GroomLink/services/api/prisma/ \
  ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/services/api/prisma/

rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no" \
  /home/ubuntu/Desktop/GroomLink/services/api/package.json \
  ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/services/api/package.json

echo -e "${GREEN}✓ API build synced${NC}"
echo ""

# Step 3: SSH into VPS and restart services
echo -e "${BLUE}Step 3: Restarting services on VPS...${NC}"
ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /root/GroomLink

echo "Running database migrations..."
cd services/api
npx prisma migrate deploy
npx prisma generate

echo "Restarting Docker services..."
cd /root/GroomLink
docker-compose -f docker-compose.prod.yml restart api admin

echo "Waiting for services to start..."
sleep 10

echo "Checking API health..."
curl -s http://localhost/api/health | head -c 200

echo ""
echo "Services restarted successfully!"
ENDSSH

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${GREEN}✓${NC} Admin panel updated with Paystack settings"
echo -e "${GREEN}✓${NC} API updated with Paystack support"
echo -e "${GREEN}✓${NC} Database migrations applied"
echo ""
echo "Next steps:"
echo "1. Login to admin dashboard: https://groomlinkgh.com/admin"
echo "2. Go to Settings → Payment tab"
echo "3. Select 'Paystack' as payment gateway"
echo "4. Enter your Paystack API keys"
echo "5. Click 'Save Changes'"
echo ""
