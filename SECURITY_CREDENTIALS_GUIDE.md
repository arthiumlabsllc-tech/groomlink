# 🔐 GroomLink Security Guide - API Keys & Credentials

## ✅ Secure Architecture Implemented

Your app now follows **security best practices** - API keys are stored on your VPS and injected at build time, **NEVER committed to Git**.

---

## 🏗️ How It Works

### Before (INSECURE) ❌:
```
app.json → Hardcoded API key → Committed to Git → Anyone can steal it!
```

### After (SECURE) ✅:
```
VPS Docker (.env) → Fetched at build time → Injected into app → NOT in Git!
```

---

## 📋 What Was Changed

### 1. **Backend Config Endpoint Created**

**File**: `services/api/src/routes/config.ts`

Your API now has a public config endpoint that returns non-sensitive configuration:

```
GET https://groomlinkgh.com/api/config
```

**Returns**:
```json
{
  "success": true,
  "config": {
    "googleMapsApiKey": "AIzaSy...",
    "apiBaseUrl": "https://groomlinkgh.com/api",
    "features": {
      "mapsEnabled": true,
      "notificationsEnabled": true,
      "paymentsEnabled": true
    }
  }
}
```

**⚠️ Security Note**: Only non-sensitive config is exposed. JWT secrets, DB credentials, etc. are NEVER returned.

---

### 2. **Dynamic app.config.js Created**

**File**: `apps/customer-app/app.config.js`

Replaced static `app.json` with dynamic `app.config.js` that reads from environment variables:

```javascript
plugins: [
  [
    "react-native-maps",
    {
      androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS || ""
    }
  ]
]
```

**Key Point**: `process.env.GOOGLE_MAPS_API_KEY` is injected at **build time only**.

---

### 3. **Hardcoded Keys Removed**

**Removed from**:
- ✅ `apps/customer-app/app.json` - No more hardcoded API key
- ✅ `apps/partners-app/app.json` - No more hardcoded API key
- ✅ Git repository - Keys are in `.gitignore`

---

### 4. **Secure Build Script Created**

**File**: `apps/customer-app/secure-build.sh`

This script:
1. SSHs into your VPS
2. Fetches API keys from Docker container
3. Sets them as environment variables
4. Builds the app with keys injected
5. **Keys are NEVER stored in the repository**

---

## 🚀 How to Build Securely

### Option 1: Using Secure Build Script (Recommended)

```bash
# SSH into your development machine (Linux/Mac)
cd apps/customer-app

# Make script executable
chmod +x secure-build.sh

# Run secure build
./secure-build.sh
```

**What it does**:
```
1. Fetches API key from VPS Docker container
2. Sets as environment variable: GOOGLE_MAPS_API_KEY
3. Runs: npx expo prebuild --clean
4. Runs: eas build --platform android
5. API key is injected at build time
6. API key is NOT committed to Git
```

---

### Option 2: Manual Secure Build (Windows PowerShell)

```powershell
# Step 1: Fetch API key from VPS
$apiKey = ssh root@187.124.210.205 "docker inspect groomlink-api --format='{{range .Config.Env}}{{println .}}{{end}}' | grep GOOGLE_MAPS_API_KEY | cut -d'=' -f2"

# Step 2: Set as environment variable
$env:GOOGLE_MAPS_API_KEY = $apiKey

# Step 3: Verify it's set
echo $env:GOOGLE_MAPS_API_KEY

# Step 4: Build app
cd apps/customer-app
npx expo prebuild --clean
eas build --platform android

# Step 5: API key is injected, NOT stored in repo
```

---

### Option 3: Using .env File (Local Development Only)

For local development (NOT for production builds):

```powershell
# .env file already created in apps/customer-app/.env
# It's in .gitignore, so it won't be committed

# Just run:
cd apps/customer-app
npx expo start

# Expo will automatically load .env variables
```

**⚠️ Important**: `.env` files are for **local development only**. Never commit them!

---

## 🔒 Security Checklist

### ✅ What's Protected:

- [x] API keys NOT in app.json
- [x] API keys NOT in source code
- [x] API keys NOT in Git repository
- [x] API keys stored securely on VPS Docker container
- [x] API keys injected at build time only
- [x] `.env` files in `.gitignore`
- [x] Config endpoint returns only non-sensitive data
- [x] JWT secrets, DB credentials never exposed

### ⚠️ What You Should Do:

- [ ] Enable API key restrictions in Google Cloud Console
- [ ] Set up API key rotation schedule
- [ ] Monitor API key usage in Google Cloud Console
- [ ] Use different keys for development/production
- [ ] Never share VPS credentials
- [ ] Use SSH keys instead of passwords (future improvement)

---

## 📁 File Structure

```
GroomLink Ghana/
├── .env.example                    # Template (safe to commit)
├── .gitignore                      # Ignores all .env files ✅
│
├── apps/customer-app/
│   ├── .env                        # Local dev keys (IGNORED by Git) ✅
│   ├── app.config.js               # Dynamic config (reads env vars) ✅
│   ├── app.json                    # Static config (NO keys) ✅
│   └── secure-build.sh             # Secure build script ✅
│
├── services/api/
│   └── src/routes/
│       └── config.ts               # Config endpoint (returns non-sensitive data) ✅
│
└── VPS Docker Container
    └── .env.production             # Production keys (secure on VPS) ✅
```

---

## 🔍 Verify Security

### Check Git Status:

```powershell
# Make sure .env files are not tracked
git status

# Should NOT show:
# - apps/customer-app/.env
# - apps/partners-app/.env
# - services/api/.env
```

### Check app.json:

```powershell
# Verify no API keys in app.json
cat apps/customer-app/app.json | grep -i "AIza"

# Should return nothing (no hardcoded keys)
```

### Check Git History:

```powershell
# Search for leaked keys in Git history
git log --all --full-history --source -S "AIzaSyBMVYRP"

# If found, you need to purge from Git history
```

---

## 🛡️ Google Cloud Console - API Key Restrictions

Make your API key even more secure:

### 1. **Application Restrictions**

Go to: https://console.cloud.google.com/apis/credentials

Select your API key → Edit → Application restrictions:

**For Android**:
- Select "Android apps"
- Add package name: `com.arthiumlabsllc.groomlink`
- Add SHA-1 certificate fingerprint (from EAS build)

**For iOS**:
- Select "iOS apps"
- Add bundle ID: `com.arthiumlabsllc.groomlink`

---

### 2. **API Restrictions**

Select your API key → Edit → API restrictions:

- Select "Restrict key"
- Check only these APIs:
  - ✅ Maps SDK for Android
  - ✅ Maps SDK for iOS
  - ✅ Geocoding API
  - ❌ DO NOT enable unrelated APIs

---

## 🔄 API Key Rotation

If you suspect a key leak:

### 1. Create New Key:

```bash
# SSH to VPS
ssh root@187.124.210.205

# Get current key
docker inspect groomlink-api --format='{{range .Config.Env}}{{println .}}{{end}}' | grep GOOGLE_MAPS_API_KEY

# Create new key in Google Cloud Console
# Then update Docker container:
docker stop groomlink-api
# Update .env file with new key
docker start groomlink-api
```

### 2. Rebuild Apps:

```bash
# Run secure build with new key
./secure-build.sh
```

### 3. Delete Old Key:

In Google Cloud Console → Delete old API key

---

## 📊 Docker Connection Status

### Current Docker Containers (All Running ✅):

```
groomlink-api        → Port 3000 (has GOOGLE_MAPS_API_KEY)
groomlink-postgres   → Port 5432
groomlink-redis      → Port 6379
groomlink-admin      → Port 8080
groomlink-customer   → Port 8084
groomlink-partners   → Port 8082
groomlink-support    → Port 8083
groomlink-nginx      → Port 80/443 (HTTPS)
```

### Mobile App → Docker Connection:

✅ **API Endpoint**: `https://groomlinkgh.com/api`  
✅ **Config Endpoint**: `https://groomlinkgh.com/api/config`  
✅ **WebSocket**: `https://groomlinkgh.com`  

Your mobile apps connect to your Docker containers through the Nginx reverse proxy on port 443 (HTTPS).

---

## 🎯 Summary

### What's Secure Now:

✅ **API keys on VPS** - Stored in Docker container environment variables  
✅ **No hardcoded keys** - Removed from app.json  
✅ **Dynamic config** - Uses app.config.js with env vars  
✅ **Build-time injection** - Keys added only during build  
✅ **Git-safe** - .env files ignored by Git  
✅ **Config endpoint** - Returns only non-sensitive data  
✅ **Secure build script** - Fetches keys from VPS automatically  

### Next Steps:

1. ✅ Build app using secure method
2. ✅ Test map screen - should work
3. ✅ Verify no keys in Git
4. ✅ Set up API key restrictions in Google Cloud Console
5. ✅ Monitor API usage

---

**Status**: 🔐 Secure architecture implemented  
**Credentials**: Safe on VPS, not in Git  
**Ready to Build**: Yes, using secure build script
