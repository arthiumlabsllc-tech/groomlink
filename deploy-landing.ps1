# Deploy Landing Page to VPS
# This script builds and deploys the landing page (including privacy policy) to your VPS

$ErrorActionPreference = "Stop"

# Configuration
$VPS_USER = "root"
$VPS_HOST = "187.124.210.205"
$VPS_PATH = "/root/GroomLink"
$LOCAL_PATH = "c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\apps\landing"

Write-Host "=== Deploying Landing Page to VPS ===" -ForegroundColor Green
Write-Host "VPS: $VPS_USER@$VPS_HOST" -ForegroundColor Yellow
Write-Host ""

# Step 1: Navigate to landing page directory
Write-Host "Step 1: Building landing page..." -ForegroundColor Blue
Set-Location $LOCAL_PATH

# Step 2: Install dependencies (if needed)
Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install

# Step 3: Build the landing page
Write-Host "Building landing page..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build successful" -ForegroundColor Green
Write-Host ""

# Step 4: Sync built files to VPS
Write-Host "Step 2: Syncing files to VPS..." -ForegroundColor Blue
Write-Host "Uplanding dist folder to VPS..." -ForegroundColor Blue

# Use rsync if available (Git Bash), otherwise use scp
if (Get-Command rsync -ErrorAction SilentlyContinue) {
    rsync -avz --delete `
        -e "ssh -o StrictHostKeyChecking=no" `
        ./dist/ `
        "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/landing/dist/"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Rsync failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Rsync not available. Using scp..." -ForegroundColor Yellow
    Write-Host "Note: For full deployment, consider using Git Bash or WSL for rsync support" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual steps required:" -ForegroundColor Red
    Write-Host "1. Open Git Bash or WSL" -ForegroundColor Yellow
    Write-Host "2. Run: scp -r -o StrictHostKeyChecking=no ./dist/* root@187.124.210.205:/root/GroomLink/apps/landing/dist/" -ForegroundColor Cyan
    Write-Host ""
    
    # Try scp as fallback
    scp -r -o StrictHostKeyChecking=no ./dist/* "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/landing/dist/"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ SCP failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Files synced to VPS" -ForegroundColor Green
Write-Host ""

# Step 5: Restart landing page container on VPS
Write-Host "Step 3: Restarting landing page service..." -ForegroundColor Blue
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" @"
cd $VPS_PATH
echo 'Rebuilding and restarting landing container...'
docker-compose -f docker-compose.prod.yml build landing
docker-compose -f docker-compose.prod.yml up -d landing
echo 'Waiting for service to start...'
sleep 5
echo 'Checking if landing page is running...'
docker ps | grep landing
echo 'Landing page restarted successfully!'
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to restart service on VPS" -ForegroundColor Red
    Write-Host "You may need to manually restart: ssh root@187.124.210.205" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Service restarted" -ForegroundColor Green
Write-Host ""

# Step 6: Verify deployment
Write-Host "Step 4: Verifying deployment..." -ForegroundColor Blue
Write-Host "Checking if privacy policy is accessible..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "https://groomlinkgh.com/privacy" -Method Head -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Privacy policy is live at: https://groomlinkgh.com/privacy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Could not verify deployment automatically" -ForegroundColor Yellow
    Write-Host "Please manually check: https://groomlinkgh.com/privacy" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your updated privacy policy should now be live!" -ForegroundColor Green
Write-Host "URL: https://groomlinkgh.com/privacy" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit https://groomlinkgh.com/privacy to verify the update" -ForegroundColor White
Write-Host "2. Test on mobile device to ensure it's responsive" -ForegroundColor White
Write-Host "3. Update Google Play Console with the privacy policy URL" -ForegroundColor White
Write-Host ""

# Return to original directory
Set-Location -Path $PSScriptRoot
