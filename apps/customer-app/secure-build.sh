#!/bin/bash

# Secure Build Script for GroomLink Customer App
# This script fetches API keys from VPS and builds the app securely
# Keys are NEVER committed to Git

set -e

echo "=== GroomLink Secure Build Script ==="
echo ""

# Configuration
VPS_HOST="187.124.210.205"
VPS_USER="root"

# Step 1: Fetch Google Maps API Key from VPS
echo "Step 1: Fetching Google Maps API Key from VPS..."
GOOGLE_MAPS_API_KEY=$(ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "docker inspect groomlink-api --format='{{range .Config.Env}}{{println .}}{{end}}' | grep GOOGLE_MAPS_API_KEY | cut -d'=' -f2")

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    echo "❌ Failed to fetch Google Maps API Key from VPS"
    exit 1
fi

echo "✓ Google Maps API Key retrieved"
echo ""

# Step 2: Export as environment variable for build
echo "Step 2: Setting environment variables..."
export GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY"

# You can add more keys here if needed:
# export GOOGLE_MAPS_API_KEY_IOS="..."
# export OTHER_API_KEY="..."

echo "✓ Environment variables set"
echo ""

# Step 3: Verify app.config.js exists
echo "Step 3: Verifying configuration..."
if [ ! -f "app.config.js" ]; then
    echo "❌ app.config.js not found!"
    exit 1
fi

echo "✓ app.config.js found"
echo ""

# Step 4: Clean and prebuild
echo "Step 4: Running expo prebuild..."
npx expo prebuild --clean

echo "✓ Prebuild complete"
echo ""

# Step 5: Build with EAS
echo "Step 5: Starting EAS build..."
echo ""
echo "The API key is injected as an environment variable."
echo "It will NOT be stored in the repository."
echo ""

eas build --platform android --profile production

echo ""
echo "=== Build Complete ==="
echo ""
echo "Your APK/AAB has been built securely!"
echo "The Google Maps API key was injected at build time and is NOT in the repository."
echo ""
