# Landing Page VPS Deployment - Complete Guide

## ✅ Build Status: Complete (Local)

Your landing page has been built successfully with all updates:
- Privacy policy with correct phone numbers
- Data deletion page
- All navigation links

---

## 🚨 Issue Found

The VPS server at `187.124.210.205` has the following setup:
- Docker container `groomlink-landing` is running on port 8081
- The container was built from source code (not mounted volumes)
- Current `/root/GroomLink/apps/landing/` directory is EMPTY (no source code)
- Files were uploaded but Docker build is failing due to missing source files

---

## 🔧 SOLUTION: Two Options

### **Option 1: Quick Fix - Use Pre-built dist folder (RECOMMENDED)**

Since you already have the built `dist` folder, create a simple Docker setup:

#### Step 1: SSH into your VPS
```bash
ssh root@187.124.210.205
```

#### Step 2: Create a simple Dockerfile
```bash
cd /root/GroomLink/apps/landing

cat > Dockerfile << 'ENDOFFILE'
FROM nginx:alpine

# Copy built files
COPY dist/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
ENDOFFILE
```

#### Step 3: Verify files are in place
```bash
ls -la dist/
# Should show: index.html, assets/, etc.

ls -la nginx.conf
# Should show the nginx config file
```

#### Step 4: Build Docker image
```bash
docker build -t groomlink-landing:latest .
```

#### Step 5: Start container
```bash
docker run -d \
  --name groomlink-landing \
  --restart always \
  -p 8081:80 \
  groomlink-landing:latest
```

#### Step 6: Verify
```bash
docker ps | grep landing
curl http://localhost:8081/privacy
```

---

### **Option 2: Full Source Deployment**

If you want to deploy the full source code:

#### Step 1: Upload entire landing folder to VPS

From your Windows machine (Git Bash):
```bash
cd "/c/Users/Robin/Desktop/Arthium Labs LLC/GroomLink Ghana/apps/landing"

# Upload everything except node_modules
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  ./ \
  root@187.124.210.205:/root/GroomLink/apps/landing/
```

Or use WinSCP to upload the entire folder.

#### Step 2: SSH and build
```bash
ssh root@187.124.210.205

cd /root/GroomLink/apps/landing

# Install dependencies
npm install

# Build
npm run build

# Build Docker image with original Dockerfile
docker build -t groomlink-landing:latest .

# Run container
docker run -d \
  --name groomlink-landing \
  --restart always \
  -p 8081:80 \
  groomlink-landing:latest
```

---

## 📋 Current VPS Status

### What's on VPS now:
```
/root/GroomLink/apps/landing/
├── Dockerfile          ✅ Uploaded (original - requires source)
├── nginx.conf          ✅ Uploaded
├── package.json        ✅ Uploaded
└── dist/               ✅ Uploaded
    ├── index.html
    ├── assets/
    └── [other files]
```

### What's missing:
- ❌ Source code (`src/` folder)
- ❌ TypeScript config (`tsconfig.json`)
- ❌ Vite config (`vite.config.ts`)
- ❌ Other build dependencies

---

## ⚡ Quick Commands (Copy-Paste for Option 1)

SSH into VPS and run these commands:

```bash
# Navigate to landing directory
cd /root/GroomLink/apps/landing

# Create simple Dockerfile
cat > Dockerfile << 'ENDOFFILE'
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
ENDOFFILE

# Verify dist folder exists
ls -la dist/

# Build image
docker build -t groomlink-landing:latest .

# Remove old container if exists
docker stop groomlink-landing 2>/dev/null || true
docker rm groomlink-landing 2>/dev/null || true

# Start new container
docker run -d \
  --name groomlink-landing \
  --restart always \
  -p 8081:80 \
  groomlink-landing:latest

# Check status
docker ps | grep landing

# Test
curl -I http://localhost:8081/
```

---

## 🔍 Verification Checklist

After deployment, verify these URLs work:

- [ ] https://groomlinkgh.com/ - Homepage loads
- [ ] https://groomlinkgh.com/privacy - Privacy policy with updated phone numbers
- [ ] https://groomlinkgh.com/delete-account - Data deletion page
- [ ] Footer has "Delete My Account" link
- [ ] Mobile responsive design works
- [ ] No 404 or 502 errors

---

## 🐛 Troubleshooting

### Container won't start:
```bash
# Check logs
docker logs groomlink-landing

# Check if port is in use
docker ps | grep 8081
```

### Files not updating:
```bash
# Rebuild container
cd /root/GroomLink/apps/landing
docker build -t groomlink-landing:latest .
docker restart groomlink-landing
```

### Nginx errors:
```bash
# Check nginx config
docker exec groomlink-landing nginx -t

# View nginx logs
docker exec groomlink-landing cat /var/log/nginx/error.log
```

---

## 📊 Nginx Configuration

Your VPS has a main nginx reverse proxy (`groomlink-nginx` container) that routes traffic:
- Port 80/443 → Main nginx
- Routes to `groomlink-landing` on port 8081 for `/privacy`, `/delete-account`, etc.

Make sure the main nginx config includes routing to the landing page.

---

## 📞 Need Help?

If you're stuck, you can:
1. Use **WinSCP** to upload files visually
2. Use **PuTTY** to SSH and run commands
3. Use **Git Bash** for rsync/scp commands

---

**Recommended**: Use **Option 1** (Quick Fix) since you already have the built dist folder uploaded!
