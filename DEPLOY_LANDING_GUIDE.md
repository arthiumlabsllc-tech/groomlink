# Deploy Landing Page - Quick Guide

## Option 1: Automated Deployment (Recommended)

### Using PowerShell Script

1. **Open PowerShell** in the project root directory:
   ```
   cd "c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana"
   ```

2. **Run the deployment script**:
   ```powershell
   .\deploy-landing.ps1
   ```

3. **Wait for completion** - The script will:
   - Build the landing page
   - Upload files to VPS
   - Restart the Docker container
   - Verify the deployment

---

## Option 2: Manual Deployment (Step-by-Step)

### Step 1: Build the Landing Page

Open PowerShell and navigate to the landing page directory:

```powershell
cd "c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\apps\landing"
```

Install dependencies (if needed):

```powershell
npm install
```

Build the project:

```powershell
npm run build
```

**Expected output**: A `dist` folder will be created with the built files.

---

### Step 2: Upload Files to VPS

#### Option A: Using Git Bash (Recommended - has rsync)

1. Open **Git Bash**
2. Navigate to landing directory:
   ```bash
   cd "/c/Users/Robin/Desktop/Arthium Labs LLC/GroomLink Ghana/apps/landing"
   ```

3. Sync files to VPS:
   ```bash
   rsync -avz --delete \
     -e "ssh -o StrictHostKeyChecking=no" \
     ./dist/ \
     root@187.124.210.205:/root/GroomLink/apps/landing/dist/
   ```

#### Option B: Using PowerShell (with scp)

```powershell
cd "c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\apps\landing"
scp -r -o StrictHostKeyChecking=no ./dist/* root@187.124.210.205:/root/GroomLink/apps/landing/dist/
```

**Note**: You may be prompted for your VPS password.

---

### Step 3: Restart Docker Container on VPS

SSH into your VPS:

```powershell
ssh root@187.124.210.205
```

Once connected, run:

```bash
cd /root/GroomLink

# Rebuild and restart the landing page container
docker-compose -f docker-compose.prod.yml build landing
docker-compose -f docker-compose.prod.yml up -d landing

# Wait a moment
sleep 5

# Verify it's running
docker ps | grep landing

# Exit SSH
exit
```

---

### Step 4: Verify Deployment

Open your browser and visit:
- **Privacy Policy**: https://groomlinkgh.com/privacy
- **Landing Page**: https://groomlinkgh.com

Check that:
- ✅ The page loads without errors
- ✅ Phone numbers are updated: +233 59 371 1285 / +233 20 933 6689
- ✅ All sections are visible
- ✅ The page is mobile responsive

---

## Option 3: Full Docker Rebuild on VPS

If you prefer to rebuild everything on the VPS directly:

1. **SSH into VPS**:
   ```powershell
   ssh root@187.124.210.205
   ```

2. **Navigate to project directory**:
   ```bash
   cd /root/GroomLink
   ```

3. **Pull latest code** (if using git on VPS):
   ```bash
   git pull origin main
   ```

4. **Rebuild landing page container**:
   ```bash
   docker-compose -f docker-compose.prod.yml build landing
   docker-compose -f docker-compose.prod.yml up -d landing
   ```

5. **Verify**:
   ```bash
   docker ps | grep landing
   curl -I http://localhost:8081/privacy
   ```

---

## Troubleshooting

### Build Fails

**Error**: TypeScript compilation errors
**Solution**: 
```powershell
cd apps/landing
npm install
npm run build
```

### SSH Connection Issues

**Error**: Connection refused or timeout
**Solution**:
- Verify VPS is running
- Check SSH service: `ssh -v root@187.124.210.205`
- Verify firewall allows port 22

### Files Not Updating

**Issue**: Privacy policy still shows old content
**Solution**:
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + F5)
3. Verify files were uploaded correctly:
   ```bash
   ssh root@187.124.210.205 "ls -la /root/GroomLink/apps/landing/dist/"
   ```

### Container Not Starting

**Error**: Docker container fails to start
**Solution**:
```bash
ssh root@187.124.210.205
cd /root/GroomLink

# Check logs
docker-compose -f docker-compose.prod.yml logs landing

# Try rebuilding
docker-compose -f docker-compose.prod.yml build --no-cache landing
docker-compose -f docker-compose.prod.yml up -d landing
```

### Nginx Configuration Issue

**Error**: 404 or 502 errors
**Solution**:
```bash
ssh root@187.124.210.205
cd /root/GroomLink

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

---

## Post-Deployment Checklist

After deployment, verify:

- [ ] Privacy policy loads at https://groomlinkgh.com/privacy
- [ ] Phone numbers are correct: +233 59 371 1285 / +233 20 933 6689
- [ ] All 13 sections are visible
- [ ] Links to third-party privacy policies work
- [ ] Page is mobile responsive
- [ ] No console errors in browser
- [ ] Google Play Console privacy policy URL is set to: https://groomlinkgh.com/privacy

---

## Quick Commands Reference

### Build locally:
```powershell
cd apps/landing
npm run build
```

### Upload to VPS:
```bash
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" ./dist/ root@187.124.210.205:/root/GroomLink/apps/landing/dist/
```

### Restart container:
```bash
ssh root@187.124.210.205 "cd /root/GroomLink && docker-compose -f docker-compose.prod.yml up -d landing"
```

### Check if live:
```powershell
curl -I https://groomlinkgh.com/privacy
```

---

**Deployment Time**: ~5-10 minutes  
**Downtime**: ~30 seconds (during container restart)  
**Status**: Ready to deploy
