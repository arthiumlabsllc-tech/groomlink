#!/bin/bash
# Fix git repo and deploy latest code
cd /opt/groomlink

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "=== Initializing git repo ==="
  git init
  git remote add origin https://github.com/GroomlinkGh/GroomLink.git 2>/dev/null || echo "Remote already exists"
fi

# Save current .env before pull
echo "=== Backing up .env ==="
cp services/api/.env /tmp/api-env-backup 2>/dev/null

# Fetch and reset to latest main
echo "=== Fetching latest code ==="
git fetch origin main
git reset --hard origin/main

# Restore .env (with Africa's Talking credentials)
echo "=== Restoring .env ==="
cp /tmp/api-env-backup services/api/.env 2>/dev/null

# Verify Africa's Talking code is present
echo "=== Verifying SMS service ==="
grep -c "AfricasTalking" services/api/src/services/sms.service.ts 2>/dev/null && echo "Africa's Talking code found!" || echo "WARNING: Africa's Talking code NOT found"

# Rebuild and restart API
echo "=== Rebuilding API with latest code ==="
docker-compose build api 2>&1 | tail -5
docker-compose up -d api 2>&1

# Wait for healthy
echo "=== Waiting for API to be healthy ==="
sleep 10
docker ps | grep api

# Test the OTP endpoint
echo "=== Testing OTP endpoint ==="
curl -s -X POST http://localhost:3000/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233200000001"}' | head -200

echo ""
echo "=== Done ==="
