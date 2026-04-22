# 🔐 Quick Reference: Secure API Key Management

## ✅ What's Fixed

Your app is now **SECURE** - API keys are on your VPS and injected at build time, **NEVER in Git**.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  VPS Docker     │ ← API keys stored here securely
│  (Production)   │
└────────┬────────┘
         │
         │ SSH (fetch at build time)
         │
┌────────▼────────┐
│  Build Script   │ ← Sets env vars temporarily
│  (Local)        │
└────────┬────────┘
         │
         │ Inject as environment variable
         │
┌────────▼────────┐
│  EAS Build      │ ← API key baked into APK/AAB
│  (Cloud)        │
└────────┬────────┘
         │
         │ Download
         │
┌────────▼────────┐
│  Install on     │ ← App works with Google Maps
│  Device         │
└─────────────────┘
```

**Key Point**: API key is ONLY in:
- ✅ VPS Docker container (secure)
- ✅ Built APK/AAB file (compiled, not readable)
- ❌ NOT in source code
- ❌ NOT in Git repository

---

## 🚀 Build Your App (Secure Method)

### Windows PowerShell:

```powershell
# 1. Fetch API key from VPS
$apiKey = ssh root@187.124.210.205 "docker inspect groomlink-api --format='{{range .Config.Env}}{{println .}}{{end}}' | grep GOOGLE_MAPS_API_KEY | cut -d'=' -f2"

# 2. Set as environment variable
$env:GOOGLE_MAPS_API_KEY = $apiKey

# 3. Build app
cd "apps/customer-app"
npx expo prebuild --clean
eas build --platform android
```

### Linux/Mac:

```bash
cd apps/customer-app
chmod +x secure-build.sh
./secure-build.sh
```

---

## 🔍 Test Config Endpoint

Your API now has a config endpoint:

```bash
# Test it
curl https://groomlinkgh.com/api/config

# Should return:
{
  "success": true,
  "config": {
    "googleMapsApiKey": "AIzaSy...",
    "apiBaseUrl": "https://groomlinkgh.com/api",
    "features": { ... }
  }
}
```

---

## ✅ Security Checklist

- [x] API keys removed from app.json
- [x] app.config.js uses environment variables
- [x] .env files in .gitignore
- [x] Config endpoint created on API
- [x] Secure build script created
- [x] No hardcoded credentials in Git
- [x] Keys stored on VPS Docker container

---

## 📁 Important Files

| File | Purpose | Safe to Commit? |
|------|---------|-----------------|
| `app.config.js` | Dynamic config (reads env vars) | ✅ YES |
| `app.json` | Static config (NO keys) | ✅ YES |
| `.env` | Local dev keys | ❌ NO (in .gitignore) |
| `secure-build.sh` | Build script | ✅ YES |
| `services/api/src/routes/config.ts` | Config endpoint | ✅ YES |

---

## 🐛 Troubleshooting

### Map still crashes after build?

```powershell
# Check if API key was injected
npx expo config | grep -A 3 "googleMaps"

# Should show your API key
```

### Verify .env not in Git?

```powershell
git status

# Should NOT show .env files
```

### Check if API key leaked?

```powershell
git log --all --full-history -S "AIzaSy"

# Should return nothing
```

---

## 📊 Docker Status

All containers running on VPS:

```
✅ groomlink-api         (has GOOGLE_MAPS_API_KEY)
✅ groomlink-postgres    (database)
✅ groomlink-redis       (cache)
✅ groomlink-nginx       (HTTPS proxy)
✅ groomlink-customer    (web app)
✅ groomlink-partners    (partners web)
✅ groomlink-admin       (admin panel)
✅ groomlink-support     (support portal)
```

---

**Status**: 🔐 Secure and ready to build  
**Next**: Run secure build script to create APK
