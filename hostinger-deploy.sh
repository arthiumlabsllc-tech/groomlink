#!/bin/bash

# GroomLink Hostinger VPS Deployment Script
# Usage: ./hostinger-deploy.sh [beta|production]

set -e

ENVIRONMENT=${1:-production}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== GroomLink Hostinger Deployment ===${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# Check if running on Hostinger VPS
if [ ! -d "/home/hstgr" ]; then
    echo -e "${YELLOW}Warning: This doesn't appear to be a Hostinger VPS${NC}"
    echo "This script is optimized for Hostinger VPS hosting"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system packages
echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker if not present
echo -e "${GREEN}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}Please log out and back in for Docker permissions to take effect${NC}"
fi

# Install Docker Compose
echo -e "${GREEN}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Setup application directory
echo -e "${GREEN}Step 4: Setting up application directory...${NC}"
APP_DIR="/opt/groomlink"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone repository
echo -e "${GREEN}Step 5: Cloning repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/gr3enink-stack/automatic-bassoon.git $APP_DIR
    cd $APP_DIR
fi

# Create environment file
echo -e "${GREEN}Step 6: Setting up environment...${NC}"
ENV_FILE=".env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    cp ".env.$ENVIRONMENT.example" "$ENV_FILE"
    echo -e "${YELLOW}Please edit $ENV_FILE with your actual values${NC}"
    echo "Required variables:"
    echo "  - DB_PASSWORD"
    echo "  - REDIS_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - CLOUDINARY credentials"
fi

# Setup firewall (Hostinger specific)
echo -e "${GREEN}Step 7: Configuring firewall...${NC}"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (if accessing directly)
sudo ufw --force enable

# Deploy with Docker Compose
echo -e "${GREEN}Step 8: Deploying with Docker Compose...${NC}"
export $(grep -v '^#' "$ENV_FILE" | xargs)
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
echo -e "${GREEN}Step 9: Running database migrations...${NC}"
sleep 10
docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

# Health check
echo -e "${GREEN}Step 10: Health check...${NC}"
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo -e "${RED}✗ Health check failed (status: $HEALTH_STATUS)${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=50 api
    exit 1
fi

# Setup auto-restart on reboot
echo -e "${GREEN}Step 11: Setting up auto-start...${NC}"
sudo tee /etc/systemd/system/groomlink.service > /dev/null <<EOF
[Unit]
Description=GroomLink Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable groomlink.service

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Your application is running at:"
echo "  - API: http://$(curl -s ifconfig.me)/api"
echo "  - Admin: http://$(curl -s ifconfig.me)"
echo ""
echo "Useful commands:"
echo "  View logs: cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f"
echo "  Restart: cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart"
echo "  Stop: cd $APP_DIR && docker-compose -f docker-compose.prod.yml down"
