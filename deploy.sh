#!/bin/bash

# GroomLink Deployment Script
# Usage: ./deploy.sh [beta|production]

set -e

ENVIRONMENT=${1:-beta}
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GroomLink Deployment ===${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# Validate environment argument
if [[ ! "$ENVIRONMENT" =~ ^(beta|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'beta' or 'production'${NC}"
    exit 1
fi

# Check if env file exists
ENV_FILE=".env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file $ENV_FILE not found${NC}"
    echo "Please create it from .env.$ENVIRONMENT.example"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo -e "${GREEN}Step 1: Pulling latest code...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}Step 2: Building Docker images...${NC}"
docker-compose -f $COMPOSE_FILE build --no-cache

echo ""
echo -e "${GREEN}Step 3: Starting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

echo ""
echo -e "${GREEN}Step 4: Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE exec -T api npx prisma migrate deploy

echo ""
echo -e "${GREEN}Step 5: Health check...${NC}"
sleep 10

# Health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API health check failed (status: $HEALTH_STATUS)${NC}"
    echo "Checking logs..."
    docker-compose -f $COMPOSE_FILE logs --tail=50 api
    exit 1
fi

echo ""
echo -e "${GREEN}Step 6: Cleanup...${NC}"
docker system prune -f

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Services are running at:"
echo "  - API: http://localhost/api"
echo "  - Admin Dashboard: http://localhost"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop: docker-compose -f $COMPOSE_FILE down"
echo "  Restart: docker-compose -f $COMPOSE_FILE restart"
