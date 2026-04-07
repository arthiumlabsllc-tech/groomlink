#!/bin/bash

# GroomLink Mobile App Build Script
# Run this script to build APKs for testing

set -e

echo "=========================================="
echo "GroomLink Mobile App Build Script"
echo "=========================================="

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo ""
    echo "⚠️  You are not logged in to EAS"
    echo "Please run: eas login"
    echo "Create a free account at https://expo.dev if needed"
    exit 1
fi

echo ""
echo "Building Customer App (GroomLink)..."
echo "------------------------------------------"
cd /home/ubuntu/Desktop/GroomLink/apps/customer-app
eas build --platform android --profile preview

echo ""
echo "Building Partners App (GroomLink Partners)..."
echo "------------------------------------------"
cd /home/ubuntu/Desktop/GroomLink/apps/partners-app
eas build --platform android --profile preview

echo ""
echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""
echo "Download links available at:"
echo "https://expo.dev/accounts/$(eas whoami)/projects/groomlink-customer/builds"
echo "https://expo.dev/accounts/$(eas whoami)/projects/groomlink-partners/builds"
echo ""
echo "Share these links with your team to download and install the APKs"
