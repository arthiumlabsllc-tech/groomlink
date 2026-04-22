# Manual Deployment Instructions for Landing Page
# Since SSH requires password authentication, follow these steps manually

## Option 1: Manual SSH Deployment (Recommended)

### Step 1: Build is Complete ✅
The landing page has been built successfully. Files are in:
`apps/landing/dist/`

### Step 2: Upload Files to VPS

Open **Git Bash** or **WSL** and run:

```bash
cd "/c/Users/Robin/Desktop/Arthium Labs LLC/GroomLink Ghana/apps/landing"

# Upload files to VPS (you'll be prompted for password)
scp -r -o StrictHostKeyChecking=no ./dist/* root@187.124.210.205:/root/GroomLink/apps/landing/dist/
```

### Step 3: Rebuild and Restart Docker Container

SSH into your VPS:

```bash
ssh root@187.124.210.205
```

Once connected, run:

```bash
cd /root/GroomLink

# Rebuild the landing page container with latest code
docker-compose -f docker-compose.prod.yml build landing

# Start the container
docker-compose -f docker-compose.prod.yml up -d landing

# Wait for it to start
sleep 5

# Verify it's running
docker ps | grep landing

# Check logs if needed
docker-compose -f docker-compose.prod.yml logs landing

# Exit SSH
exit
```

### Step 4: Verify Deployment

Open your browser and test:
- **Privacy Policy**: https://groomlinkgh.com/privacy
- **Data Deletion Page**: https://groomlinkgh.com/delete-account
- **Landing Page**: https://groomlinkgh.com

---

## Option 2: Use WinSCP (GUI Tool)

1. **Download WinSCP**: https://winscp.net/eng/download.php

2. **Connect to VPS**:
   - Host: 187.124.210.205
   - Username: root
   - Password: (your VPS password)
   - Port: 22

3. **Upload Files**:
   - Local folder: `c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\apps\landing\dist`
   - Remote folder: `/root/GroomLink/apps/landing/dist`
   - Drag and drop or use sync

4. **Restart Container via SSH**:
   - Use PuTTY or any SSH client
   - Run the Docker commands from Option 1, Step 3

---

## Option 3: Setup SSH Key Authentication (For Future Automation)

### On Your Windows Machine:

1. **Generate SSH Key** (if you don't have one):
   ```powershell
   ssh-keygen -t rsa -b 4096 -C "gr3enink@gmail.com"
   ```
   Save to: `C:\Users\Robin\.ssh\id_rsa`

2. **Copy Key to VPS**:
   ```powershell
   type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@187.124.210.205 "cat >> ~/.ssh/authorized_keys"
   ```

3. **Test Key Authentication**:
   ```powershell
   ssh -o StrictHostKeyChecking=no root@187.124.210.205 "echo 'SSH key authentication works!'"
   ```

4. **Future deployments will be passwordless!**

---

## Verification Checklist

After deployment, verify:

- [ ] Privacy policy loads: https://groomlinkgh.com/privacy
- [ ] Phone numbers are correct: +233 59 371 1285 / +233 20 933 6689
- [ ] Data deletion page loads: https://groomlinkgh.com/delete-account
- [ ] All 13 sections in privacy policy are visible
- [ ] Form on deletion page works
- [ ] Footer has "Delete My Account" link
- [ ] Page is mobile responsive
- [ ] No console errors in browser

---

## Quick Commands Reference

### Build:
```powershell
cd apps/landing
npm run build
```

### Upload (Git Bash/WSL):
```bash
scp -r ./dist/* root@187.124.210.205:/root/GroomLink/apps/landing/dist/
```

### Restart:
```bash
ssh root@187.124.210.205 "cd /root/GroomLink && docker-compose -f docker-compose.prod.yml up -d landing"
```

### Test URLs:
- https://groomlinkgh.com/privacy
- https://groomlinkgh.com/delete-account
- https://groomlinkgh.com

---

**Build Status**: ✅ Complete  
**Files Ready**: ✅ Yes  
**Deploy Method**: Manual (password required)  
**Estimated Time**: 5-10 minutes
