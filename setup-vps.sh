#!/bin/bash
# VPS Setup Script for Africa's Talking SMS Integration
# Run: ssh root@187.124.210.205 'bash -s' < setup-vps.sh

echo "=== GroomLink VPS Setup ==="

# Find project directory
if [ -d "/root/GroomLink" ]; then
  cd /root/GroomLink
elif [ -d "/opt/groomlink" ]; then
  cd /opt/groomlink
else
  echo "Project not found. Cloning..."
  cd /root
  git clone https://github.com/GroomlinkGh/GroomLink.git 2>/dev/null || echo "Clone failed - check repo URL"
  cd /root/GroomLink
fi

echo "Project directory: $(pwd)"

# Pull latest code
echo "=== Pulling latest code ==="
git pull origin main

# Add Africa's Talking credentials to API .env
echo "=== Adding Africa's Talking credentials ==="
if [ -f "services/api/.env" ]; then
  # Check if already added
  if grep -q "AT_API_KEY" services/api/.env; then
    echo "Africa's Talking credentials already exist in .env"
  else
    cat >> services/api/.env << 'ENVEOF'

# Africa's Talking SMS
AT_USERNAME=sandbox
AT_API_KEY=atsk_d5d70bbcf1db56f8de2ad08eb89799d0c23bbe1897c079dcffc2a59047f3945861257797
SMS_FROM=GroomLink
ENVEOF
    echo "Credentials added to .env"
  fi
else
  echo "WARNING: services/api/.env not found!"
  echo "Creating from example..."
  if [ -f "services/api/.env.example" ]; then
    cp services/api/.env.example services/api/.env
    cat >> services/api/.env << 'ENVEOF'

# Africa's Talking SMS
AT_USERNAME=sandbox
AT_API_KEY=atsk_d5d70bbcf1db56f8de2ad08eb89799d0c23bbe1897c079dcffc2a59047f3945861257797
SMS_FROM=GroomLink
ENVEOF
    echo "Created .env from example and added credentials"
  fi
fi

# Check Docker
echo "=== Checking Docker ==="
docker ps 2>/dev/null || echo "Docker not running"

# Rebuild API
echo "=== Rebuilding API ==="
if [ -f "docker-compose.yml" ]; then
  docker-compose build api 2>&1 | tail -5
  docker-compose up -d api
  echo "API container restarted"
  docker ps | grep api
else
  echo "No docker-compose.yml found"
fi

echo "=== Setup Complete ==="
