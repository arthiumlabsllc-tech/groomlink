# Deploy Web Apps to VPS
# Syncs built files from all 5 web apps and restarts nginx on VPS

$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_HOST = "187.124.210.205"
$VPS_PATH = "/root/GroomLink"

Write-Host "=== Deploying Web Apps to VPS ===" -ForegroundColor Green
Write-Host "VPS: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Yellow
Write-Host ""

# Base path to project
$PROJECT_ROOT = "c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana"

# Function to sync a web app to VPS
function Sync-WebApp {
    param(
        [string]$AppName,
        [string]$LocalDistPath,
        [string]$RemotePath
    )
    
    Write-Host "Syncing $AppName..." -ForegroundColor Blue
    
    # Use scp to sync files (rsync not available on Windows, using scp with recursive)
    $scpArgs = @(
        "-r",
        "-o", "StrictHostKeyChecking=no",
        "${LocalDistPath}\*",
        "${VPS_USER}@${VPS_HOST}:${RemotePath}"
    )
    
    & scp @scpArgs 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $AppName synced" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to sync $AppName" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Sync all 5 web apps
Sync-WebApp "customer" "$PROJECT_ROOT\apps\customer\dist" "$VPS_PATH/apps/customer/dist"
Sync-WebApp "partners" "$PROJECT_ROOT\apps\partners\dist" "$VPS_PATH/apps/partners/dist"
Sync-WebApp "admin" "$PROJECT_ROOT\apps\admin\dist" "$VPS_PATH/apps/admin/dist"
Sync-WebApp "landing" "$PROJECT_ROOT\apps\landing\dist" "$VPS_PATH/apps/landing/dist"
Sync-WebApp "support" "$PROJECT_ROOT\apps\support\dist" "$VPS_PATH/apps/support/dist"

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "All 5 web apps deployed" -ForegroundColor Green
Write-Host ""
Write-Host "Next: SSH to VPS and reload nginx:" -ForegroundColor Yellow
Write-Host "  ssh root@187.124.210.205 'nginx -t && nginx -s reload'" -ForegroundColor White
Write-Host ""
Write-Host "Web Apps:" -ForegroundColor Cyan
Write-Host "  Landing:  https://groomlinkgh.com" -ForegroundColor White
Write-Host "  Customer: https://groomlinkgh.com/app" -ForegroundColor White
Write-Host "  Partners: https://groomlinkgh.com/partners" -ForegroundColor White
Write-Host "  Admin:    https://groomlinkgh.com/admin" -ForegroundColor White
Write-Host "  Support:  https://groomlinkgh.com/support" -ForegroundColor White
